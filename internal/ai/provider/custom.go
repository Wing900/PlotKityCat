package provider

import (
	"context"

	"plotkitycat/internal/ai/openai"
)

type CustomClient struct {
	client *openai.Client
}

func NewCustomClient() *CustomClient {
	return &CustomClient{client: openai.NewClient()}
}

func (c *CustomClient) Chat(ctx context.Context, request ChatRequest) (string, error) {
	return c.client.Generate(ctx, openai.Request{
		BaseURL:       request.Settings.URL,
		APIKey:        request.Settings.Key,
		Model:         request.Settings.Model,
		RequireAPIKey: true,
		SystemPrompt:  request.SystemPrompt,
		UserPrompt:    request.UserPrompt,
		Images:        request.Images,
	})
}
