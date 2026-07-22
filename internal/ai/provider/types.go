package provider

import "context"

type ServiceMode string

const (
	ModeFree         ServiceMode = "free"
	ModeCustom       ServiceMode = "custom"
	ModeSubscription ServiceMode = "subscription"
)

type Settings struct {
	Mode  ServiceMode
	URL   string
	Key   string
	Model string
}

type ChatRequest struct {
	Settings     Settings
	SystemPrompt string
	UserPrompt   string
	Images       []string
}

type ChatClient interface {
	Chat(context.Context, ChatRequest) (string, error)
}
