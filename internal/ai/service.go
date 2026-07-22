package ai

import (
	"context"
	"fmt"
	"path/filepath"

	"plotkitycat/internal/ai/generation"
	"plotkitycat/internal/ai/optimize"
	"plotkitycat/internal/ai/provider"
	"plotkitycat/internal/ai/repair"
	"plotkitycat/internal/subscription"
)

type Service struct {
	generation *generation.Service
	optimize   *optimize.Service
	repair     *repair.Service
}

func NewService(subscriptionService *subscription.Service) *Service {
	prompts := NewPromptRepository(filepath.Join("internal", "ai", "prompts"))
	router := provider.NewRouter(
		provider.NewFreeClient(),
		provider.NewCustomClient(),
		provider.NewSubscriptionClient(subscriptionService),
	)
	return &Service{
		generation: generation.NewService(router, prompts),
		optimize:   optimize.NewService(router, prompts),
		repair:     repair.NewService(router, prompts),
	}
}

func (s *Service) Generate(ctx context.Context, request GenerationRequest) (GenerationResult, error) {
	if request.Kind != GenerationKindVisualize {
		return GenerationResult{}, fmt.Errorf("design card 已改为独立后端链路，请使用专用接口")
	}

	result, err := s.generation.GenerateCode(ctx, generation.Request{
		SceneName:   request.SceneName,
		CurrentCode: request.CurrentCode,
		Settings:    request.Settings.ToProviderSettings(),
		Selection: generation.SelectionPayload{
			Items: mapGenerationSelectionItems(request.Selection.Items),
		},
	})
	if err != nil {
		return GenerationResult{}, err
	}

	return GenerationResult{
		Code:   result.Code,
		Source: result.Source,
	}, nil
}

func (s *Service) Repair(ctx context.Context, request RepairRequest) (RepairResult, error) {
	result, err := s.repair.RepairCode(ctx, repair.Request{
		SceneName:   request.SceneName,
		CurrentCode: request.CurrentCode,
		ErrorText:   request.ErrorText,
		Settings:    request.Settings.ToProviderSettings(),
	})
	if err != nil {
		return RepairResult{}, err
	}

	return RepairResult{
		Patch:  result.Patch,
		Source: result.Source,
	}, nil
}

func (s *Service) Optimize(ctx context.Context, request OptimizeRequest) (OptimizeResult, error) {
	result, err := s.optimize.OptimizeCode(ctx, optimize.Request{
		SceneName:   request.SceneName,
		CurrentCode: request.CurrentCode,
		Instruction: request.Instruction,
		Settings:    request.Settings.ToProviderSettings(),
	})
	if err != nil {
		return OptimizeResult{}, err
	}

	return OptimizeResult{
		Patch:  result.Patch,
		Source: result.Source,
	}, nil
}

func mapGenerationSelectionItems(items []SelectionItem) []generation.SelectionItem {
	mapped := make([]generation.SelectionItem, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, generation.SelectionItem{
			Kind:         item.Kind,
			Text:         item.Text,
			Name:         item.Name,
			Alt:          item.Alt,
			DataURL:      item.DataURL,
			RelativePath: item.RelativePath,
		})
	}

	return mapped
}
