package workflow

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"

	"plotkitycat/internal/aicode/operations"
	"plotkitycat/internal/aicode/runstate"
)

type Builder interface {
	Build(ctx context.Context, request operations.BuildRequest) (operations.BuildResult, error)
}

type Service struct {
	builder  Builder
	executor Executor
	events   EventSink

	mu      sync.Mutex
	active  *sessionEntry
	counter uint64
}

func NewService(builder Builder, executor Executor, events EventSink) *Service {
	return &Service{
		builder:  builder,
		executor: executor,
		events:   events,
	}
}

func (s *Service) Start(request Request) (Session, error) {
	if request.SceneName == "" {
		return Session{}, errors.New("缺少场景名，无法启动 AI 工作流")
	}
	if request.MaxAttempts <= 0 {
		request.MaxAttempts = 8
	}

	session := Session{
		ID:          fmt.Sprintf("aiwf-%d", atomic.AddUint64(&s.counter, 1)),
		SceneName:   request.SceneName,
		Kind:        request.Kind,
		MaxAttempts: request.MaxAttempts,
		State:       WorkflowStateWorking,
	}

	ctx, cancel := context.WithCancel(context.Background())

	s.mu.Lock()
	if s.active != nil {
		s.mu.Unlock()
		cancel()
		return Session{}, errors.New("已有 AI 工作流正在运行，请先等待完成或手动停止")
	}
	s.active = &sessionEntry{
		cancel:  cancel,
		session: session,
	}
	s.mu.Unlock()

	s.events.Started(session)
	go s.run(ctx, request, session.ID)

	return session, nil
}

func (s *Service) Stop(sessionID string) error {
	s.mu.Lock()
	entry := s.active
	if entry == nil || entry.session.ID != sessionID {
		s.mu.Unlock()
		return errors.New("AI 工作流会话不存在或已结束")
	}
	entry.session.Stopped = true
	entry.cancel()
	s.mu.Unlock()

	return s.executor.Stop()
}

func (s *Service) IsActiveSession(sessionID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.active != nil && s.active.session.ID == sessionID
}

func (s *Service) run(ctx context.Context, request Request, sessionID string) {
	defer s.clearActive(sessionID)

	currentCode := request.CurrentCode
	var lastFailure *runstate.NormalizedRunFailure

	for attempt := 1; attempt <= max(1, request.MaxAttempts); attempt++ {
		if ctx.Err() != nil {
			s.markInterrupted(sessionID, request.SceneName, attempt, "已中断 AI 检查")
			return
		}

		s.setState(sessionID, WorkflowStateWorking, attempt)
		nextCode, buildErr := s.builder.Build(ctx, operations.BuildRequest{
			Kind:        request.Kind,
			SceneName:   request.SceneName,
			CurrentCode: currentCode,
			Instruction: request.Instruction,
			ErrorText:   request.ErrorText,
			Selection:   request.Selection,
			Settings:    request.Settings,
			Attempt:     attempt,
			LastFailure: lastFailure,
		})
		if buildErr != nil {
			if ctx.Err() != nil {
				s.markInterrupted(sessionID, request.SceneName, attempt, "已中断 AI 检查")
				return
			}
			s.markFailure(sessionID, request.SceneName, attempt, normalizeBuildError(buildErr))
			return
		}

		currentCode = nextCode.Code
		s.events.CodeApplied(CodeAppliedEvent{
			SessionID:     sessionID,
			SceneName:     request.SceneName,
			Code:          currentCode,
			ChangedRanges: nextCode.ChangedRanges,
			Attempt:       attempt,
		})

		s.setState(sessionID, WorkflowStateChecking, attempt)
		failure := runstate.NormalizeExecutionResult(s.executor.Execute(ctx, request.SceneName, currentCode))
		if failure == nil {
			s.setState(sessionID, WorkflowStateSucceeded, attempt)
			s.events.Succeeded(SucceededEvent{
				SessionID: sessionID,
				SceneName: request.SceneName,
				Attempt:   attempt,
			})
			return
		}

		if failure.Kind == runstate.FailureKindInterrupted {
			s.markInterrupted(sessionID, request.SceneName, attempt, failure.ErrorText)
			return
		}

		if !failure.Repairable || attempt >= request.MaxAttempts {
			s.markFailure(sessionID, request.SceneName, attempt, *failure)
			return
		}

		lastFailure = failure
	}
}

func (s *Service) clearActive(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.active != nil && s.active.session.ID == sessionID {
		s.active = nil
	}
}

func (s *Service) setState(sessionID string, state WorkflowState, attempt int) {
	s.mu.Lock()
	if s.active != nil && s.active.session.ID == sessionID {
		s.active.session.State = state
		s.active.session.Attempts = attempt
	}
	s.mu.Unlock()

	s.events.StateChanged(StateChangedEvent{
		SessionID: sessionID,
		State:     state,
		Attempt:   attempt,
	})
}

func (s *Service) markFailure(sessionID string, sceneName string, attempt int, failure runstate.NormalizedRunFailure) {
	s.setState(sessionID, WorkflowStateFailed, attempt)
	s.events.Failed(FailedEvent{
		SessionID:  sessionID,
		SceneName:  sceneName,
		Kind:       failure.Kind,
		ErrorText:  failure.ErrorText,
		Repairable: failure.Repairable,
		Attempt:    attempt,
	})
}

func (s *Service) markInterrupted(sessionID string, sceneName string, attempt int, message string) {
	s.setState(sessionID, WorkflowStateInterrupted, attempt)
	s.events.Interrupted(InterruptedEvent{
		SessionID: sessionID,
		SceneName: sceneName,
		Attempt:   attempt,
		Message:   message,
	})
}

func normalizeBuildError(err error) runstate.NormalizedRunFailure {
	var buildErr *operations.BuildError
	if errors.As(err, &buildErr) {
		if buildErr.Kind == operations.BuildErrorKindPatch {
			return runstate.NormalizedRunFailure{
				Kind:       runstate.FailureKindPatchError,
				ErrorText:  buildErr.Error(),
				Repairable: false,
			}
		}
	}

	return runstate.NormalizedRunFailure{
		Kind:       runstate.FailureKindAIError,
		ErrorText:  err.Error(),
		Repairable: false,
	}
}

func max(left int, right int) int {
	if left > right {
		return left
	}

	return right
}
