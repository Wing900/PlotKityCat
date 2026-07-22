package ai

import (
	"context"

	"plotkitycat/internal/ai/provider"
)

type ServiceMode string

const (
	ModeFree         ServiceMode = "free"
	ModeCustom       ServiceMode = "custom"
	ModeSubscription ServiceMode = "subscription"
)

type ProviderSettings struct {
	Mode  ServiceMode
	URL   string
	Key   string
	Model string
}

func (s ProviderSettings) ToProviderSettings() provider.Settings {
	return provider.Settings{
		Mode:  provider.ServiceMode(s.Mode),
		URL:   s.URL,
		Key:   s.Key,
		Model: s.Model,
	}
}

type SelectionItem struct {
	Kind         string
	Text         string
	Name         string
	Alt          string
	DataURL      string
	RelativePath string
}

type SelectionPayload struct {
	Items []SelectionItem
}

type GenerationRequest struct {
	Kind        GenerationKind
	SceneName   string
	CurrentCode string
	Settings    ProviderSettings
	Selection   SelectionPayload
}

type GenerationResult struct {
	Code   string
	Source string
}

type RepairRequest struct {
	SceneName   string
	CurrentCode string
	ErrorText   string
	Settings    ProviderSettings
}

type RepairResult struct {
	Patch  string
	Source string
}

type OptimizeRequest struct {
	SceneName   string
	CurrentCode string
	Instruction string
	Settings    ProviderSettings
}

type OptimizeResult struct {
	Patch  string
	Source string
}

type SubscriptionSession struct {
	Token    string
	BaseURL  string
	Model    string
	DeviceID string
}

type SubscriptionSessionProvider interface {
	Session(context.Context, bool) (SubscriptionSession, error)
}
