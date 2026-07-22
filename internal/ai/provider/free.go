package provider

import (
	"context"
	"os"
	"strings"

	"plotkitycat/internal/ai/openai"
)

const (
	defaultFreeBaseURL = "https://bridge.5051001.xyz/free/v1"
	freeModel          = "free-plan"
)

type FreeClient struct {
	client *openai.Client
}

func NewFreeClient() *FreeClient {
	return &FreeClient{client: openai.NewClient()}
}

func (c *FreeClient) Chat(ctx context.Context, request ChatRequest) (string, error) {
	return c.client.Generate(ctx, openai.Request{
		BaseURL:      freeBaseURL(),
		Model:        freeModel,
		SystemPrompt: request.SystemPrompt,
		UserPrompt:   request.UserPrompt,
		Images:       request.Images,
	})
}

func freeBaseURL() string {
	if value := strings.TrimSpace(os.Getenv("PLOTKITYCAT_FREE_API_BASE_URL")); value != "" {
		return value
	}

	return defaultFreeBaseURL
}
