// Package usage tracks the token usage reported by AI responses so the app can
// show how much this software used today. Numbers always come from the usage
// field returned by the server, never from local estimation.
package usage

import "sync"

// Usage is the token accounting returned by OpenAI-compatible servers.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// Recorder receives one usage sample per completed AI request.
type Recorder interface {
	Record(mode string, u Usage)
}

var (
	recorderMu sync.RWMutex
	recorder   Recorder
)

// SetRecorder installs the process-wide recorder. Passing nil disables
// recording, which is the default and keeps tests and tools silent.
func SetRecorder(r Recorder) {
	recorderMu.Lock()
	recorder = r
	recorderMu.Unlock()
}

// Record forwards a usage sample to the installed recorder, if any.
func Record(mode string, u Usage) {
	recorderMu.RLock()
	r := recorder
	recorderMu.RUnlock()
	if r != nil {
		r.Record(mode, u)
	}
}
