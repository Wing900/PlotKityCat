package workflow

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"

	"plotkitycat/internal/aicode/operations"
	"plotkitycat/internal/aicode/runstate"
)

// 手写 fake — 三个接口都很小, 比 mock.Mock 更直白
type fakeBuilder struct {
	codes  []string // 依次返回的 BuildResult.Code
	errs   []error  // 依次返回的 error (优先级高于 codes)
	calls  int
	mu     sync.Mutex
}

func (b *fakeBuilder) Build(_ context.Context, _ operations.BuildRequest) (operations.BuildResult, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.calls++
	idx := b.calls - 1
	if idx < len(b.errs) && b.errs[idx] != nil {
		return operations.BuildResult{}, b.errs[idx]
	}
	if idx < len(b.codes) {
		return operations.BuildResult{Code: b.codes[idx]}, nil
	}
	return operations.BuildResult{Code: "default-code"}, nil
}

type fakeExecutor struct {
	results []runstate.ExecutionResult
	calls   int
	stopped bool
	mu      sync.Mutex
}

func (e *fakeExecutor) Execute(_ context.Context, _ string, _ string) runstate.ExecutionResult {
	e.mu.Lock()
	defer e.mu.Unlock()
	idx := e.calls
	e.calls++
	if idx < len(e.results) {
		return e.results[idx]
	}
	return runstate.ExecutionResult{Status: runstate.ExecutionStatusReady}
}

func (e *fakeExecutor) Stop() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.stopped = true
	return nil
}

type fakeSink struct {
	mu        sync.Mutex
	succeeded SucceededEvent
	failed    FailedEvent
	interrupted InterruptedEvent
	done      chan struct{} // Succeeded/Failed/Interrupted 任一触发即 close
}

func newFakeSink() *fakeSink {
	return &fakeSink{done: make(chan struct{})}
}

func (s *fakeSink) signalOnce() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.done != nil {
		close(s.done)
		s.done = nil
	}
}

func (s *fakeSink) Started(Session)                                  {}
func (s *fakeSink) StateChanged(StateChangedEvent)                   {}
func (s *fakeSink) CodeApplied(CodeAppliedEvent)                     {}
func (s *fakeSink) Succeeded(e SucceededEvent)                       { s.succeeded = e; s.signalOnce() }
func (s *fakeSink) Failed(e FailedEvent)                             { s.failed = e; s.signalOnce() }
func (s *fakeSink) Interrupted(e InterruptedEvent)                   { s.interrupted = e; s.signalOnce() }

func startNew(t *testing.T, b Builder, e Executor, sink *fakeSink) *Service {
	t.Helper()
	if sink == nil {
		sink = newFakeSink()
	}
	return NewService(b, e, sink)
}

func await(sink *fakeSink) <-chan struct{} { return sink.done }

func TestStart_RequiresSceneName(t *testing.T) {
	svc := startNew(t, &fakeBuilder{}, &fakeExecutor{}, nil)
	_, err := svc.Start(Request{Kind: "optimize"})
	assert.ErrorContains(t, err, "场景名")
}

func TestStart_DefaultMaxAttempts(t *testing.T) {
	sink := newFakeSink()
	svc := startNew(t, &fakeBuilder{codes: []string{"c1"}}, &fakeExecutor{
		results: []runstate.ExecutionResult{{Status: runstate.ExecutionStatusReady}},
	}, sink)
	sess, err := svc.Start(Request{SceneName: "scene.py", Kind: "optimize"})
	assert.NoError(t, err)
	assert.Equal(t, 8, sess.MaxAttempts)
	<-await(sink)
}

func TestStart_RejectsDuplicate(t *testing.T) {
	sink := newFakeSink()
	svc := startNew(t, &fakeBuilder{codes: []string{"c1"}}, &fakeExecutor{
		results: []runstate.ExecutionResult{{Status: runstate.ExecutionStatusReady}},
	}, sink)
	_, _ = svc.Start(Request{SceneName: "scene.py"})
	_, err := svc.Start(Request{SceneName: "scene2.py"})
	assert.ErrorContains(t, err, "已有")
}

func TestRun_SucceedsOnReady(t *testing.T) {
	sink := newFakeSink()
	svc := startNew(t, &fakeBuilder{codes: []string{"new-code"}}, &fakeExecutor{
		results: []runstate.ExecutionResult{{Status: runstate.ExecutionStatusReady}},
	}, sink)
	sess, _ := svc.Start(Request{SceneName: "scene.py"})
	<-await(sink)
	assert.Equal(t, sess.ID, sink.succeeded.SessionID)
	assert.Equal(t, 1, sink.succeeded.Attempt)
	assert.True(t, svc.IsActiveSession(sess.ID) == false) // 已结束清空
}

func TestRun_BuildPatchErrorFailsNotRepairable(t *testing.T) {
	sink := newFakeSink()
	svc := startNew(t, &fakeBuilder{errs: []error{
		&operations.BuildError{Kind: operations.BuildErrorKindPatch, Err: errors.New("bad patch")},
	}}, &fakeExecutor{}, sink)
	svc.Start(Request{SceneName: "scene.py"})
	<-await(sink)
	assert.Equal(t, runstate.FailureKindPatchError, sink.failed.Kind)
	assert.False(t, sink.failed.Repairable)
}

func TestRun_ExecuteFailedRetriesThenSucceeds(t *testing.T) {
	sink := newFakeSink()
	svc := startNew(t, &fakeBuilder{codes: []string{"c1", "c2"}}, &fakeExecutor{
		results: []runstate.ExecutionResult{
			{Status: runstate.ExecutionStatusFailed, ErrorText: "boom"}, // repairable=true, 重试
			{Status: runstate.ExecutionStatusReady},                     // 成功
		},
	}, sink)
	svc.Start(Request{SceneName: "scene.py", MaxAttempts: 3})
	<-await(sink)
	assert.Equal(t, 2, sink.succeeded.Attempt)
}

func TestRun_ExecuteInterrupted(t *testing.T) {
	sink := newFakeSink()
	svc := startNew(t, &fakeBuilder{codes: []string{"c1"}}, &fakeExecutor{
		results: []runstate.ExecutionResult{{Status: runstate.ExecutionStatusInterrupted}},
	}, sink)
	svc.Start(Request{SceneName: "scene.py"})
	<-await(sink)
	assert.Contains(t, sink.interrupted.Message, "中断")
}

func TestStop_CancelsAndCallsExecutorStop(t *testing.T) {
	sink := newFakeSink()
	exec := &fakeExecutor{results: []runstate.ExecutionResult{{Status: runstate.ExecutionStatusInterrupted}}}
	svc := startNew(t, &fakeBuilder{codes: []string{"c1"}}, exec, sink)
	sess, _ := svc.Start(Request{SceneName: "scene.py"})
	err := svc.Stop(sess.ID)
	assert.NoError(t, err)
	assert.True(t, exec.stopped)
	<-await(sink)
}

func TestStop_UnknownSessionErrors(t *testing.T) {
	svc := startNew(t, &fakeBuilder{}, &fakeExecutor{}, nil)
	err := svc.Stop("nope")
	assert.ErrorContains(t, err, "不存在")
}