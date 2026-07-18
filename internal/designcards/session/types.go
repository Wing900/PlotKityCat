package session

import (
	"context"

	"plotkitycat/internal/ai"
	"plotkitycat/internal/designcards"
)

type State string

const (
	StateWorking     State = "working"
	StateSucceeded   State = "succeeded"
	StateFailed      State = "failed"
	StateInterrupted State = "interrupted"
)

const (
	KindGenerate = "generate"
	KindOptimize  = "optimize"
)

type Request struct {
	Kind        string
	SceneName   string
	CardID      string
	Instruction string
	Selection   []designcards.SelectionItem
	Settings    ai.ProviderSettings
}

type Session struct {
	ID        string `json:"sessionId"`
	SceneName string `json:"sceneName"`
	Kind      string `json:"kind"`
	State     State  `json:"state"`
}

type BuildResult struct {
	Card   designcards.Card
	Source string
}

type StartedEvent struct {
	SessionID string `json:"sessionId"`
	SceneName string `json:"sceneName"`
	Kind      string `json:"kind"`
}

type SucceededEvent struct {
	SessionID string           `json:"sessionId"`
	SceneName string           `json:"sceneName"`
	Card      designcards.Card `json:"card"`
	Source    string           `json:"source"`
}

type FailedEvent struct {
	SessionID string `json:"sessionId"`
	SceneName string `json:"sceneName"`
	ErrorText string `json:"errorText"`
}

type InterruptedEvent struct {
	SessionID string `json:"sessionId"`
	SceneName string `json:"sceneName"`
	Message   string `json:"message"`
}

type Builder interface {
	Build(ctx context.Context, req Request) (BuildResult, error)
}

type EventSink interface {
	Started(StartedEvent)
	Succeeded(SucceededEvent)
	Failed(FailedEvent)
	Interrupted(InterruptedEvent)
}