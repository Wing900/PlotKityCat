package ai

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"plotkitycat/internal/ai/provider"
	"plotkitycat/internal/subscription"
)

type PromptLoader interface {
	Load(name string) string
}

type Service struct {
	router  *provider.Router
	prompts PromptLoader
}

func NewService(subscriptionService *subscription.Service) *Service {
	prompts := NewPromptRepository(filepath.Join("internal", "designcards", "ai", "prompts"))
	router := provider.NewRouter(
		provider.NewFreeClient(),
		provider.NewCustomClient(),
		provider.NewSubscriptionClient(subscriptionService),
	)
	return &Service{
		router:  router,
		prompts: prompts,
	}
}

func (s *Service) GenerateFromSelection(ctx context.Context, request GenerateRequest) (Result, error) {
	raw, err := s.router.Chat(ctx, provider.ChatRequest{
		Settings:     request.Settings,
		SystemPrompt: strings.TrimSpace(s.prompts.Load(resolvePromptPath("generate", request.Settings.Mode))),
		UserPrompt:   buildGeneratePrompt(request),
		Images:       extractImageDataURLs(request.Selection),
	})
	if err != nil {
		return Result{}, err
	}

	parsed, err := parseResult(raw)
	if err != nil {
		return Result{}, err
	}

	return Result{
		Title:  parsed.Title,
		Plan:   parsed.Plan,
		SVG:    parsed.SVG,
		Source: string(request.Settings.Mode),
	}, nil
}

func (s *Service) OptimizeCard(ctx context.Context, request OptimizeRequest) (Result, error) {
	raw, err := s.router.Chat(ctx, provider.ChatRequest{
		Settings:     request.Settings,
		SystemPrompt: strings.TrimSpace(s.prompts.Load(resolvePromptPath("optimize", request.Settings.Mode))),
		UserPrompt:   buildOptimizePrompt(request),
	})
	if err != nil {
		return Result{}, err
	}

	parsed, err := parseResult(raw)
	if err != nil {
		return Result{}, err
	}

	return Result{
		Title:  parsed.Title,
		Plan:   parsed.Plan,
		SVG:    parsed.SVG,
		Source: string(request.Settings.Mode),
	}, nil
}

func resolvePromptPath(kind string, mode provider.ServiceMode) string {
	filename := "custom.txt"
	if mode == provider.ModeSubscription {
		filename = "subscription.txt"
	}

	return filepath.Join(kind, filename)
}

func buildGeneratePrompt(request GenerateRequest) string {
	lines := []string{
		fmt.Sprintf("场景名：%s", request.SceneName),
		"",
		"请根据选中内容生成一个 design card。",
	}

	textLines := make([]string, 0)
	imageLines := make([]string, 0)
	for index, item := range request.Selection {
		switch item.Kind {
		case "text":
			text := strings.TrimSpace(item.Text)
			if text != "" {
				textLines = append(textLines, fmt.Sprintf("%d. %s", len(textLines)+1, text))
			}
		case "image":
			label := firstNonEmpty(strings.TrimSpace(item.Alt), strings.TrimSpace(item.Name), fmt.Sprintf("图片 %d", index+1))
			imageLines = append(imageLines, fmt.Sprintf("%d. %s (%s)", len(imageLines)+1, label, strings.TrimSpace(item.RelativePath)))
		}
	}

	if len(textLines) > 0 {
		lines = append(lines, "", "选中文本：")
		lines = append(lines, textLines...)
	}
	if len(imageLines) > 0 {
		lines = append(lines, "", "选中图片：")
		lines = append(lines, imageLines...)
	}

	return strings.Join(lines, "\n")
}

func buildOptimizePrompt(request OptimizeRequest) string {
	return strings.Join([]string{
		fmt.Sprintf("场景名：%s", request.SceneName),
		fmt.Sprintf("卡片ID：%s", request.CardID),
		"",
		"用户优化要求：",
		strings.TrimSpace(request.Instruction),
		"",
		"当前 plan.py：",
		"```python",
		request.CurrentPlan,
		"```",
		"",
		"当前 preview.svg：",
		"```svg",
		request.CurrentSVG,
		"```",
	}, "\n")
}

func extractImageDataURLs(items []SelectionItem) []string {
	images := make([]string, 0, len(items))
	for _, item := range items {
		if item.Kind == "image" && strings.TrimSpace(item.DataURL) != "" {
			images = append(images, strings.TrimSpace(item.DataURL))
		}
	}

	return images
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}

	return ""
}
