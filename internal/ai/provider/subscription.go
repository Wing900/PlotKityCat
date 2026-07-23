package provider

import (
	"context"
	"errors"
	"strings"

	"plotkitycat/internal/ai/openai"
	"plotkitycat/internal/subscription"
)

type SubscriptionClient struct {
	client              *openai.Client
	subscriptionService *subscription.Service
}

func NewSubscriptionClient(subscriptionService *subscription.Service) *SubscriptionClient {
	return &SubscriptionClient{
		client:              openai.NewClient(),
		subscriptionService: subscriptionService,
	}
}

func (c *SubscriptionClient) Chat(ctx context.Context, request ChatRequest) (string, error) {
	if c.subscriptionService == nil {
		return "", errors.New("订阅服务未初始化")
	}

	session, err := c.subscriptionService.Session(ctx, false)
	if err != nil {
		return "", err
	}

	return c.client.Generate(ctx, openai.Request{
		BaseURL:       session.BaseURL,
		APIKey:        session.Token,
		Model:         firstNonEmptyString(session.Model, request.Settings.Model),
		Mode:          string(ModeSubscription),
		RequireAPIKey: true,
		SystemPrompt:  request.SystemPrompt,
		UserPrompt:    request.UserPrompt,
		Images:        request.Images,
	})
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}

	return ""
}
