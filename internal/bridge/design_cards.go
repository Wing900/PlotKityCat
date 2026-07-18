package bridge

import (
	"errors"
	"strings"

	"plotkitycat/internal/ai"
	"plotkitycat/internal/designcards"
)

func (a *App) GenerateDesignCardFromSelection(request AIDesignCardGenerationRequest) (AIDesignCardResult, error) {
	if len(request.Selection.Items) == 0 {
		return AIDesignCardResult{}, errors.New("请先在笔记区选择文字或图片")
	}

	card, source, err := a.designCardService.GenerateFromSelection(a.ctx, request.SceneName, mapDesignCardSelectionItems(request.Selection.Items), ai.ProviderSettings{
		Mode:  ai.ServiceMode(request.Settings.Mode),
		URL:   request.Settings.URL,
		Key:   request.Settings.Key,
		Model: request.Settings.Model,
	}.ToProviderSettings())
	if err != nil {
		return AIDesignCardResult{}, err
	}

	return AIDesignCardResult{
		Card:   mapDesignCard(card),
		Source: source,
	}, nil
}

func (a *App) OptimizeDesignCard(request AIDesignCardOptimizeRequest) (AIDesignCardResult, error) {
	if strings.TrimSpace(request.CardID) == "" {
		return AIDesignCardResult{}, errors.New("缺少 design card ID")
	}
	if strings.TrimSpace(request.Instruction) == "" {
		return AIDesignCardResult{}, errors.New("请输入想让 AI 微调的内容")
	}

	card, source, err := a.designCardService.Optimize(a.ctx, request.SceneName, request.CardID, request.Instruction, ai.ProviderSettings{
		Mode:  ai.ServiceMode(request.Settings.Mode),
		URL:   request.Settings.URL,
		Key:   request.Settings.Key,
		Model: request.Settings.Model,
	}.ToProviderSettings())
	if err != nil {
		return AIDesignCardResult{}, err
	}

	return AIDesignCardResult{
		Card:   mapDesignCard(card),
		Source: source,
	}, nil
}

func (a *App) ListDesignCards(sceneName string) ([]DesignCard, error) {
	cards, err := a.designCardService.List(sceneName)
	if err != nil {
		return nil, err
	}

	return mapDesignCards(cards), nil
}

func (a *App) GetDesignCard(sceneName string, cardID string) (DesignCard, error) {
	card, err := a.designCardService.Get(sceneName, cardID)
	if err != nil {
		return DesignCard{}, err
	}

	return mapDesignCard(card), nil
}

func (a *App) UpdateDesignCardPlan(sceneName string, cardID string, plan string) (DesignCard, error) {
	if strings.TrimSpace(cardID) == "" {
		return DesignCard{}, errors.New("缺少 design card ID")
	}
	if strings.TrimSpace(plan) == "" {
		return DesignCard{}, errors.New("plan.py 不能为空")
	}

	card, err := a.designCardService.UpdatePlan(sceneName, cardID, plan)
	if err != nil {
		return DesignCard{}, err
	}

	return mapDesignCard(card), nil
}

func (a *App) DeleteDesignCard(sceneName string, cardID string) error {
	if strings.TrimSpace(cardID) == "" {
		return errors.New("缺少 design card ID")
	}

	return a.designCardService.Delete(sceneName, cardID)
}

func (a *App) ListDesignCardVersions(sceneName string, cardID string) ([]DesignCardVersion, error) {
	versions, err := a.designCardService.ListVersions(sceneName, cardID)
	if err != nil {
		return nil, err
	}

	return mapDesignCardVersions(versions), nil
}

func mapDesignCardSelectionItems(items []AISelectionItem) []designcards.SelectionItem {
	mapped := make([]designcards.SelectionItem, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, designcards.SelectionItem{
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

func mapDesignCards(cards []designcards.Card) []DesignCard {
	mapped := make([]DesignCard, 0, len(cards))
	for _, card := range cards {
		mapped = append(mapped, mapDesignCard(card))
	}

	return mapped
}

func mapDesignCard(card designcards.Card) DesignCard {
	return DesignCard{
		ID:        card.Meta.ID,
		CreatedAt: card.Meta.CreatedAt,
		UpdatedAt: card.Meta.UpdatedAt,
		Title:     card.Meta.Title,
		Order:     card.Meta.Order,
		Plan:      card.Plan,
		SVG:       card.SVG,
	}
}

func mapDesignCardVersions(versions []designcards.Version) []DesignCardVersion {
	mapped := make([]DesignCardVersion, 0, len(versions))
	for _, version := range versions {
		mapped = append(mapped, DesignCardVersion{
			ID:        version.ID,
			Label:     version.Label,
			Note:      version.Note,
			Plan:      version.Plan,
			SVG:       version.SVG,
			CreatedAt: version.CreatedAt,
		})
	}

	return mapped
}
