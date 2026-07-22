package provider

import "context"

type Router struct {
	free         ChatClient
	custom       ChatClient
	subscription ChatClient
}

func NewRouter(free ChatClient, custom ChatClient, subscription ChatClient) *Router {
	return &Router{
		free:         free,
		custom:       custom,
		subscription: subscription,
	}
}

func (r *Router) Chat(ctx context.Context, request ChatRequest) (string, error) {
	if request.Settings.Mode == ModeFree {
		return r.free.Chat(ctx, request)
	}
	if request.Settings.Mode == ModeSubscription {
		return r.subscription.Chat(ctx, request)
	}

	return r.custom.Chat(ctx, request)
}
