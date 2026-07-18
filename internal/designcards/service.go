package designcards

import (
	"context"

	"plotkitycat/internal/ai/provider"
	designai "plotkitycat/internal/designcards/ai"
)

type Service struct {
	store *Store
	ai    *designai.Service
}

func NewService(store *Store, aiService *designai.Service) *Service {
	return &Service{
		store: store,
		ai:    aiService,
	}
}

func (s *Service) GenerateFromSelection(ctx context.Context, sceneName string, selection []SelectionItem, settings provider.Settings) (Card, string, error) {
	result, err := s.ai.GenerateFromSelection(ctx, designai.GenerateRequest{
		SceneName: sceneName,
		Selection: mapSelectionItems(selection),
		Settings:  settings,
	})
	if err != nil {
		return Card{}, "", err
	}

	card, err := s.store.Create(sceneName, result.Title, result.Plan, result.SVG)
	if err != nil {
		return Card{}, "", err
	}

	return card, result.Source, nil
}

func (s *Service) Optimize(ctx context.Context, sceneName string, cardID string, instruction string, settings provider.Settings) (Card, string, error) {
	card, err := s.store.Get(sceneName, cardID)
	if err != nil {
		return Card{}, "", err
	}

	result, err := s.ai.OptimizeCard(ctx, designai.OptimizeRequest{
		SceneName:   sceneName,
		CardID:      cardID,
		CurrentPlan: card.Plan,
		CurrentSVG:  card.SVG,
		Instruction: instruction,
		Settings:    settings,
	})
	if err != nil {
		return Card{}, "", err
	}

	updated, err := s.store.UpdateContent(sceneName, cardID, result.Title, result.Plan, result.SVG)
	if err != nil {
		return Card{}, "", err
	}
	if _, err := s.store.CreateVersion(sceneName, cardID, instruction, updated.Plan, updated.SVG); err != nil {
		return Card{}, "", err
	}

	return updated, result.Source, nil
}

func (s *Service) List(sceneName string) ([]Card, error) {
	return s.store.List(sceneName)
}

func (s *Service) Get(sceneName string, cardID string) (Card, error) {
	return s.store.Get(sceneName, cardID)
}

func (s *Service) UpdatePlan(sceneName string, cardID string, plan string) (Card, error) {
	return s.store.UpdatePlan(sceneName, cardID, plan)
}

func (s *Service) Delete(sceneName string, cardID string) error {
	return s.store.Delete(sceneName, cardID)
}

func (s *Service) ListVersions(sceneName string, cardID string) ([]Version, error) {
	return s.store.ListVersions(sceneName, cardID)
}

func mapSelectionItems(items []SelectionItem) []designai.SelectionItem {
	mapped := make([]designai.SelectionItem, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, designai.SelectionItem{
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
