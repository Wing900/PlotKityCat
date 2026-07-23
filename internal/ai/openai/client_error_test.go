package openai

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newClientRequest(baseURL, mode string) Request {
	return Request{
		BaseURL:      baseURL,
		Model:        "free-plan",
		Mode:         mode,
		SystemPrompt: "sys",
		UserPrompt:   "hi",
	}
}

func TestGenerate_FreeModeErrorMessagesByStatusCode(t *testing.T) {
	cases := []struct {
		status int
		want   string
	}{
		{http.StatusTooManyRequests, "免费额度暂时用完，过段时间再试试。"},
		{http.StatusForbidden, "免费模型配置异常，请更新客户端。"},
		{http.StatusNotFound, "免费服务暂未开放。"},
		{http.StatusServiceUnavailable, "免费服务暂时不可用，请稍后再试。"},
		{http.StatusBadRequest, "AI 服务返回失败：bad request body"},
	}
	for _, c := range cases {
		t.Run(http.StatusText(c.status), func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(c.status)
				_, _ = io.WriteString(w, "bad request body")
			}))
			defer srv.Close()

			_, err := NewClient().Generate(context.Background(), newClientRequest(srv.URL, "free"))
			if err == nil {
				t.Fatalf("expected error for status %d, got nil", c.status)
			}
			if err.Error() != c.want {
				t.Fatalf("status %d err = %q, want %q", c.status, err.Error(), c.want)
			}
		})
	}
}

func TestGenerate_CustomModeErrorMessagesByStatusCode(t *testing.T) {
	cases := []struct {
		status int
		want   string
	}{
		{http.StatusTooManyRequests, "请求过于频繁，请稍后再试。"},
		{http.StatusForbidden, "请求被拒绝（鉴权或模型不被允许）。"},
		{http.StatusNotFound, "服务地址不存在，请检查 URL。"},
		{http.StatusServiceUnavailable, "服务暂时不可用，请稍后再试。"},
		{http.StatusBadRequest, "AI 服务返回失败：bad request body"},
	}
	for _, c := range cases {
		t.Run(http.StatusText(c.status), func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(c.status)
				_, _ = io.WriteString(w, "bad request body")
			}))
			defer srv.Close()

			_, err := NewClient().Generate(context.Background(), newClientRequest(srv.URL, "custom"))
			if err == nil {
				t.Fatalf("expected error for status %d, got nil", c.status)
			}
			if err.Error() != c.want {
				t.Fatalf("status %d err = %q, want %q", c.status, err.Error(), c.want)
			}
		})
	}
}

func TestGenerate_SubscriptionModeErrorMessagesByStatusCode(t *testing.T) {
	cases := []struct {
		status int
		want   string
	}{
		{http.StatusTooManyRequests, "订阅额度暂时用完，请稍后再试。"},
		{http.StatusForbidden, "订阅鉴权失败，请刷新订阅状态。"},
		{http.StatusNotFound, "订阅服务地址不存在。"},
		{http.StatusServiceUnavailable, "订阅服务暂时不可用，请稍后再试。"},
		{http.StatusBadRequest, "AI 服务返回失败：bad request body"},
	}
	for _, c := range cases {
		t.Run(http.StatusText(c.status), func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(c.status)
				_, _ = io.WriteString(w, "bad request body")
			}))
			defer srv.Close()

			_, err := NewClient().Generate(context.Background(), newClientRequest(srv.URL, "subscription"))
			if err == nil {
				t.Fatalf("expected error for status %d, got nil", c.status)
			}
			if err.Error() != c.want {
				t.Fatalf("status %d err = %q, want %q", c.status, err.Error(), c.want)
			}
		})
	}
}

func TestGenerate_UnknownModeFallsBackToGenericMessage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = io.WriteString(w, "rate limited")
	}))
	defer srv.Close()

	_, err := NewClient().Generate(context.Background(), newClientRequest(srv.URL, ""))
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "AI 服务返回失败") {
		t.Fatalf("err = %q, want generic failure", err.Error())
	}
}