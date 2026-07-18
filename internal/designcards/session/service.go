package session

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
)

type sessionEntry struct {
	cancel  context.CancelFunc
	session Session
}

type Service struct {
	builder Builder
	events  EventSink
	mu      sync.Mutex
	active  *sessionEntry
	counter uint64
}

func NewService(builder Builder, events EventSink) *Service {
	return &Service{builder: builder, events: events}
}

func (s *Service) Start(req Request) (Session, error) {
	if err := validateRequest(req); err != nil {
		return Session{}, err
	}
	sess := Session{
		ID:        fmt.Sprintf("dcs-%d", atomic.AddUint64(&s.counter, 1)),
		SceneName: req.SceneName,
		Kind:      req.Kind,
		State:     StateWorking,
	}
	ctx, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	if s.active != nil {
		s.mu.Unlock()
		cancel()
		return Session{}, errors.New("已有设计卡片会话正在运行, 请先等待完成或中断")
	}
	s.active = &sessionEntry{cancel: cancel, session: sess}
	s.mu.Unlock()

	s.events.Started(StartedEvent{SessionID: sess.ID, SceneName: sess.SceneName, Kind: sess.Kind})
	go s.run(ctx, sess, req)
	return sess, nil
}

func validateRequest(req Request) error {
	if req.SceneName == "" {
		return errors.New("缺少场景名, 无法启动设计卡片会话")
	}
	if req.Kind != KindGenerate && req.Kind != KindOptimize {
		return errors.New("未知的设计卡片会话类型: " + req.Kind)
	}
	return nil
}

func (s *Service) Stop(sessionID string) error {
	s.mu.Lock()
	entry := s.active
	if entry == nil || entry.session.ID != sessionID {
		s.mu.Unlock()
		return errors.New("设计卡片会话不存在或已结束")
	}
	entry.session.State = StateInterrupted
	entry.cancel()
	s.mu.Unlock()
	return nil
}

func (s *Service) IsActiveSession(sessionID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.active != nil && s.active.session.ID == sessionID
}

func (s *Service) run(ctx context.Context, sess Session, req Request) {
	defer s.clearActive(sess.ID)
	result, err := s.builder.Build(ctx, req)
	if err != nil {
		if ctx.Err() != nil {
			s.markInterrupted(sess, "已中断设计卡片生成")
			return
		}
		s.markFailed(sess, err.Error())
		return
	}
	if ctx.Err() != nil {
		s.markInterrupted(sess, "已中断设计卡片生成")
		return
	}
	s.markSucceeded(sess, result)
}

func (s *Service) setState(sessionID string, state State) {
	s.mu.Lock()
	if s.active != nil && s.active.session.ID == sessionID {
		s.active.session.State = state
	}
	s.mu.Unlock()
}

func (s *Service) markSucceeded(sess Session, result BuildResult) {
	s.setState(sess.ID, StateSucceeded)
	s.events.Succeeded(SucceededEvent{
		SessionID: sess.ID,
		SceneName: sess.SceneName,
		Card:      result.Card,
		Source:    result.Source,
	})
}

func (s *Service) markFailed(sess Session, errText string) {
	s.setState(sess.ID, StateFailed)
	s.events.Failed(FailedEvent{
		SessionID: sess.ID,
		SceneName: sess.SceneName,
		ErrorText: errText,
	})
}

func (s *Service) markInterrupted(sess Session, message string) {
	s.setState(sess.ID, StateInterrupted)
	s.events.Interrupted(InterruptedEvent{
		SessionID: sess.ID,
		SceneName: sess.SceneName,
		Message:   message,
	})
}

func (s *Service) clearActive(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.active != nil && s.active.session.ID == sessionID {
		s.active = nil
	}
}