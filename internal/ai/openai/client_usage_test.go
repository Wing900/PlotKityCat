package openai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"plotkitycat/internal/ai/usage"
)

type captureRecorder struct {
	mu      sync.Mutex
	mode    string
	usage   usage.Usage
	records int
}

func (c *captureRecorder) Record(mode string, u usage.Usage) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.mode = mode
	c.usage = u
	c.records++
}

func TestGenerate_StreamRequestsUsageAndRecordsFinalChunk(t *testing.T) {
	recorder := &captureRecorder{}
	usage.SetRecorder(recorder)
	t.Cleanup(func() { usage.SetRecorder(nil) })

	var bodyMu sync.Mutex
	var gotBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		bodyMu.Lock()
		_ = json.Unmarshal(raw, &gotBody)
		bodyMu.Unlock()
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, strings.Join([]string{
			`data: {"choices":[{"delta":{"content":"he"}}]}`,
			`data: {"choices":[{"delta":{"content":"llo"}}]}`,
			`data: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":3,"total_tokens":15}}`,
			`data: [DONE]`,
			"",
		}, "\n\n"))
	}))
	defer srv.Close()

	content, err := NewClient().Generate(context.Background(), newClientRequest(srv.URL, "subscription"))
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if content != "hello" {
		t.Fatalf("content = %q", content)
	}

	bodyMu.Lock()
	opts, ok := gotBody["stream_options"].(map[string]any)
	bodyMu.Unlock()
	if !ok || opts["include_usage"] != true {
		t.Fatalf("request missing stream_options.include_usage: %v", gotBody["stream_options"])
	}
	if recorder.records != 1 || recorder.mode != "subscription" {
		t.Fatalf("records=%d mode=%q", recorder.records, recorder.mode)
	}
	if recorder.usage != (usage.Usage{PromptTokens: 12, CompletionTokens: 3, TotalTokens: 15}) {
		t.Fatalf("usage = %+v", recorder.usage)
	}
}

func TestGenerate_NonStreamResponseRecordsUsage(t *testing.T) {
	recorder := &captureRecorder{}
	usage.SetRecorder(recorder)
	t.Cleanup(func() { usage.SetRecorder(nil) })

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"choices":[{"message":{"content":"ok"}}],"usage":{"prompt_tokens":5,"completion_tokens":1,"total_tokens":6}}`)
	}))
	defer srv.Close()

	content, err := NewClient().Generate(context.Background(), newClientRequest(srv.URL, "free"))
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if content != "ok" {
		t.Fatalf("content = %q", content)
	}
	if recorder.records != 1 || recorder.mode != "free" || recorder.usage.TotalTokens != 6 {
		t.Fatalf("records=%d mode=%q usage=%+v", recorder.records, recorder.mode, recorder.usage)
	}
}

func TestGenerate_StreamWithoutUsageRecordsNothing(t *testing.T) {
	recorder := &captureRecorder{}
	usage.SetRecorder(recorder)
	t.Cleanup(func() { usage.SetRecorder(nil) })

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"choices\":[{\"delta\":{\"content\":\"x\"}}]}\n\ndata: [DONE]\n\n")
	}))
	defer srv.Close()

	if _, err := NewClient().Generate(context.Background(), newClientRequest(srv.URL, "custom")); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if recorder.records != 0 {
		t.Fatalf("expected no usage record, got %d", recorder.records)
	}
}
