package bridge

import (
	"context"
	"errors"

	"plotkitycat/internal/ai"
	"plotkitycat/internal/ai/provider"
	"plotkitycat/internal/designcards"
	"plotkitycat/internal/designcards/session"
)

type designCardBuilder struct {
	service *designcards.Service
}

func (b designCardBuilder) Build(ctx context.Context, req session.Request) (session.BuildResult, error) {
	settings := ai.ProviderSettings{
		Mode:  ai.ServiceMode(req.Settings.Mode),
		URL:   req.Settings.URL,
		Key:   req.Settings.Key,
		Model: req.Settings.Model,
	}.ToProviderSettings()

	if req.Kind == session.KindGenerate {
		return b.buildGenerate(ctx, req, settings)
	}
	if req.Kind == session.KindOptimize {
		return b.buildOptimize(ctx, req, settings)
	}
	return session.BuildResult{}, errors.New("未知的设计卡片会话类型: " + req.Kind)
}

func (b designCardBuilder) buildGenerate(
	ctx context.Context,
	req session.Request,
	settings provider.Settings,
) (session.BuildResult, error) {
	card, source, err := b.service.GenerateFromSelection(ctx, req.SceneName, req.Selection, settings)
	if err != nil {
		return session.BuildResult{}, err
	}
	return session.BuildResult{Card: card, Source: source}, nil
}

func (b designCardBuilder) buildOptimize(
	ctx context.Context,
	req session.Request,
	settings provider.Settings,
) (session.BuildResult, error) {
	card, source, err := b.service.Optimize(ctx, req.SceneName, req.CardID, req.Instruction, settings)
	if err != nil {
		return session.BuildResult{}, err
	}
	return session.BuildResult{Card: card, Source: source}, nil
}

func (a *App) StartDesignCardSession(request AIDesignCardSessionRequest) (AIDesignCardSession, error) {
	if a.designCardSession == nil {
		return AIDesignCardSession{}, errors.New("设计卡片会话服务未就绪")
	}
	sess, err := a.designCardSession.Start(toSessionRequest(request))
	if err != nil {
		return AIDesignCardSession{}, err
	}
	return AIDesignCardSession{
		SessionID: sess.ID,
		SceneName: sess.SceneName,
		Kind:      sess.Kind,
		State:     string(sess.State),
	}, nil
}

func (a *App) StopDesignCardSession(sessionID string) error {
	if a.designCardSession == nil {
		return errors.New("设计卡片会话服务未就绪")
	}
	return a.designCardSession.Stop(sessionID)
}

func toSessionRequest(request AIDesignCardSessionRequest) session.Request {
	return session.Request{
		Kind:        request.Kind,
		SceneName:   request.SceneName,
		CardID:      request.CardID,
		Instruction: request.Instruction,
		Selection:   mapDesignCardSelectionItems(request.Selection.Items),
		Settings: ai.ProviderSettings{
			Mode:  ai.ServiceMode(request.Settings.Mode),
			URL:   request.Settings.URL,
			Key:   request.Settings.Key,
			Model: request.Settings.Model,
		},
	}
}