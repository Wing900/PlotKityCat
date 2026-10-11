package openai

import (
	"strings"
	"testing"
)

func TestReadChatContentFromStreamingResponse(t *testing.T) {
	body := strings.NewReader(strings.Join([]string{
		`data: {"choices":[{"delta":{"content":"print("}}]}`,
		`data: {"choices":[{"delta":{"content":"\"ok\")"}}]}`,
		`data: [DONE]`,
		"",
	}, "\n\n"))

	content, _, err := readChatContent(body, "text/event-stream; charset=utf-8")
	if err != nil {
		t.Fatalf("readChatContent returned error: %v", err)
	}
	if content != `print("ok")` {
		t.Fatalf("content = %q, want %q", content, `print("ok")`)
	}
}

func TestReadChatContentFromJSONResponse(t *testing.T) {
	body := strings.NewReader(`{"choices":[{"message":{"content":"print(\"ok\")"}}]}`)

	content, _, err := readChatContent(body, "application/json")
	if err != nil {
		t.Fatalf("readChatContent returned error: %v", err)
	}
	if content != `print("ok")` {
		t.Fatalf("content = %q, want %q", content, `print("ok")`)
	}
}
