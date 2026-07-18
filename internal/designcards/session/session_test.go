package session

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"plotkitycat/internal/ai"
	"plotkitycat/internal/designcards"
)

type fakeBuilder struct {
	mu      sync.Mutex
	started chan struct{}
	release chan struct{}
	failErr error
	result  BuildResult
	delayed bool
}

func newFakeBuilder(result BuildResult) *fakeBuilder {
	return &fakeBuilder{
		started: make(chan struct{}),
		release: make(chan struct{}),
		result:  result,
	}
}

func (b *fakeBuilder) Build(ctx context.Context, req Request) (BuildResult, error) {
	if b.delayed {
		close(b.started)
		select {
		case <-ctx.Done():
			return BuildResult{}, ctx.Err()
		case <-b.release:
		}
	}
	if b.failErr != nil {
		return BuildResult{}, b.failErr
	}
	return b.result, nil
}

type recordingSink struct {
	mu     sync.Mutex
	events []string
	card   designcards.Card
	source string
}

func (s *recordingSink) Started(e StartedEvent) {
	s.mu.Lock()
	s.events = append(s.events, "started:"+e.SessionID)
	s.mu.Unlock()
}

func (s *recordingSink) Succeeded(e SucceededEvent) {
	s.mu.Lock()
	s.events = append(s.events, "succeeded:"+e.SessionID)
	s.card = e.Card
	s.source = e.Source
	s.mu.Unlock()
}

func (s *recordingSink) Failed(e FailedEvent) {
	s.mu.Lock()
	s.events = append(s.events, "failed:"+e.SessionID+":"+e.ErrorText)
	s.mu.Unlock()
}

func (s *recordingSink) Interrupted(e InterruptedEvent) {
	s.mu.Lock()
	s.events = append(s.events, "interrupted:"+e.SessionID)
	s.mu.Unlock()
}

func (s *recordingSink) snapshot() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]string, len(s.events))
	copy(out, s.events)
	return out
}

func baseRequest(kind string) Request {
	return Request{Kind: kind, SceneName: "scene-a", Settings: ai.ProviderSettings{}}
}

func TestSessionStartEmitsStartedAndSucceeded(t *testing.T) {
	wantCard := designcards.Card{Meta: designcards.Meta{ID: "card-1", Title: "t"}}
	sink := &recordingSink{}
	svc := NewService(newFakeBuilder(BuildResult{Card: wantCard, Source: "raw"}), sink)

	sess, err := svc.Start(baseRequest(KindGenerate))
	if err != nil {
		t.Fatalf("start: %v", err)
	}
	if sess.ID == "" {
		t.Fatal("empty session id")
	}
	if !waitFor(t, func() bool { return len(sink.snapshot()) >= 2 }) {
		t.Fatalf("events not fired: %v", sink.snapshot())
	}
	got := sink.snapshot()
	if got[0] != "started:"+sess.ID {
		t.Fatalf("first event = %q, want started", got[0])
	}
	if got[1] != "succeeded:"+sess.ID {
		t.Fatalf("second event = %q, want succeeded", got[1])
	}
	if sink.card.Meta.ID != wantCard.Meta.ID {
		t.Fatalf("card = %+v, want %+v", sink.card, wantCard)
	}
}

func TestSessionStopCancelsCtxAndEmitsInterrupted(t *testing.T) {
	sink := &recordingSink{}
	builder := newFakeBuilder(BuildResult{})
	builder.delayed = true
	svc := NewService(builder, sink)

	sess, err := svc.Start(baseRequest(KindOptimize))
	if err != nil {
		t.Fatalf("start: %v", err)
	}
	select {
	case <-builder.started:
	case <-time.After(time.Second):
		t.Fatal("builder not started")
	}
	if err := svc.Stop(sess.ID); err != nil {
		t.Fatalf("stop: %v", err)
	}
	close(builder.release)
	if !waitFor(t, func() bool {
		for _, e := range sink.snapshot() {
			if e == "interrupted:"+sess.ID {
				return true
			}
		}
		return false
	}) {
		t.Fatalf("interrupted not fired: %v", sink.snapshot())
	}
}

func TestSessionStartRejectsConcurrent(t *testing.T) {
	sink := &recordingSink{}
	builder := newFakeBuilder(BuildResult{})
	builder.delayed = true
	svc := NewService(builder, sink)

	if _, err := svc.Start(baseRequest(KindGenerate)); err != nil {
		t.Fatalf("first start: %v", err)
	}
	if _, err := svc.Start(baseRequest(KindOptimize)); err == nil {
		t.Fatal("second start should reject, got nil")
	}
	close(builder.release)
}

func TestSessionStopUnknownIDErrors(t *testing.T) {
	svc := NewService(newFakeBuilder(BuildResult{}), &recordingSink{})
	if err := svc.Stop("nope"); err == nil {
		t.Fatal("stop unknown id should error")
	}
}

func TestSessionBuildFailureEmitsFailed(t *testing.T) {
	sink := &recordingSink{}
	builder := newFakeBuilder(BuildResult{})
	builder.failErr = errors.New("boom")
	svc := NewService(builder, sink)

	sess, err := svc.Start(baseRequest(KindGenerate))
	if err != nil {
		t.Fatalf("start: %v", err)
	}
	if !waitFor(t, func() bool {
		for _, e := range sink.snapshot() {
			if e == "failed:"+sess.ID+":boom" {
				return true
			}
		}
		return false
	}) {
		t.Fatalf("failed not fired: %v", sink.snapshot())
	}
}

func waitFor(t *testing.T, cond func() bool) bool {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return true
		}
		time.Sleep(5 * time.Millisecond)
	}
	return cond()
}