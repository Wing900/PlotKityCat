package openai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const requestTimeout = 5 * time.Minute

type Client struct {
	httpClient *http.Client
}

type Request struct {
	BaseURL       string
	APIKey        string
	Model         string
	Mode          string
	RequireAPIKey bool
	SystemPrompt  string
	UserPrompt    string
	Images        []string
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{},
	}
}

func (c *Client) Generate(ctx context.Context, request Request) (string, error) {
	baseURL := strings.TrimSpace(request.BaseURL)
	apiKey := strings.TrimSpace(request.APIKey)
	model := strings.TrimSpace(request.Model)
	if baseURL == "" || model == "" || (request.RequireAPIKey && apiKey == "") {
		return "", fmt.Errorf("AI 请求缺少 URL / KEY / MODEL")
	}

	body := ChatRequest{
		Model: model,
		Messages: []Message{
			{Role: "system", Content: request.SystemPrompt},
			{Role: "user", Content: buildUserContent(request.UserPrompt, request.Images)},
		},
		Stream: true,
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()

	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, completionsURL(baseURL), bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("Accept", "text/event-stream")
	if apiKey != "" {
		httpRequest.Header.Set("Authorization", "Bearer "+apiKey)
	}

	response, err := c.httpClient.Do(httpRequest)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	if response.StatusCode >= 400 {
		var errBody bytes.Buffer
		_, _ = errBody.ReadFrom(response.Body)
		message := strings.TrimSpace(errBody.String())
		return "", friendlyError(response.StatusCode, message, request.Mode)
	}

	content, err := readChatContent(response.Body, response.Header.Get("Content-Type"))
	if err != nil {
		return "", err
	}
	content = strings.TrimSpace(content)
	if content == "" {
		return "", fmt.Errorf("AI 服务返回了空内容")
	}

	return content, nil
}

func buildUserContent(prompt string, images []string) any {
	if len(images) == 0 {
		return prompt
	}

	parts := []ContentPart{
		{Type: "text", Text: prompt},
	}
	for _, image := range images {
		trimmed := strings.TrimSpace(image)
		if trimmed == "" {
			continue
		}
		parts = append(parts, ContentPart{
			Type:     "image_url",
			ImageURL: &ImageURL{URL: trimmed},
		})
	}

	return parts
}

func completionsURL(baseURL string) string {
	trimmed := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if strings.HasSuffix(trimmed, "/chat/completions") {
		return trimmed
	}

	return trimmed + "/chat/completions"
}

func readChatContent(body io.Reader, contentType string) (string, error) {
	if strings.Contains(strings.ToLower(contentType), "text/event-stream") {
		return readStreamingChatContent(body)
	}

	var result ChatResponse
	if err := json.NewDecoder(body).Decode(&result); err != nil {
		return "", err
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("AI 服务未返回内容")
	}

	return result.Choices[0].Message.Content, nil
}

func readStreamingChatContent(body io.Reader) (string, error) {
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var builder strings.Builder
	sawChoice := false
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, ":") {
			continue
		}
		if !strings.HasPrefix(line, "data:") {
			continue
		}

		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			break
		}

		var chunk ChatStreamResponse
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			return "", err
		}
		for _, choice := range chunk.Choices {
			sawChoice = true
			builder.WriteString(choice.Delta.Content)
			builder.WriteString(choice.Message.Content)
		}
	}
	if err := scanner.Err(); err != nil {
		return "", err
	}
	if !sawChoice {
		return "", fmt.Errorf("AI 服务未返回内容")
	}

	return builder.String(), nil
}

// friendlyError maps an upstream HTTP failure to a user-facing message that
// matches the AI mode (free / custom / subscription). Unknown modes and
// unlisted status codes fall back to the generic "AI 服务返回失败" form.
func friendlyError(statusCode int, body, mode string) error {
	if msg, ok := modeErrorMessage(statusCode, mode); ok {
		return fmt.Errorf("%s", msg)
	}
	if body == "" {
		return fmt.Errorf("AI 服务返回失败：%d", statusCode)
	}
	return fmt.Errorf("AI 服务返回失败：%s", body)
}

func modeErrorMessage(statusCode int, mode string) (string, bool) {
	table, ok := errorMessagesByMode[mode]
	if !ok {
		return "", false
	}
	msg, ok := table[statusCode]
	return msg, ok
}

var errorMessagesByMode = map[string]map[int]string{
	"free": {
		http.StatusTooManyRequests:  "免费额度暂时用完，过段时间再试试。",
		http.StatusForbidden:        "免费模型配置异常，请更新客户端。",
		http.StatusNotFound:         "免费服务暂未开放。",
		http.StatusServiceUnavailable: "免费服务暂时不可用，请稍后再试。",
	},
	"custom": {
		http.StatusTooManyRequests:    "请求过于频繁，请稍后再试。",
		http.StatusForbidden:          "请求被拒绝（鉴权或模型不被允许）。",
		http.StatusNotFound:           "服务地址不存在，请检查 URL。",
		http.StatusServiceUnavailable: "服务暂时不可用，请稍后再试。",
	},
	"subscription": {
		http.StatusTooManyRequests:    "订阅额度暂时用完，请稍后再试。",
		http.StatusForbidden:          "订阅鉴权失败，请刷新订阅状态。",
		http.StatusNotFound:           "订阅服务地址不存在。",
		http.StatusServiceUnavailable: "订阅服务暂时不可用，请稍后再试。",
	},
}
