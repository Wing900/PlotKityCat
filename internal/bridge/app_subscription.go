package bridge

import (
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) GetSubscriptionStatus(force bool) (SubscriptionStatus, error) {
	if a.subscriptionService == nil {
		return SubscriptionStatus{
			Status:    "error",
			Message:   "订阅服务未初始化",
			Activated: false,
		}, nil
	}

	view, err := a.subscriptionService.Status(a.ctx, force)
	if err != nil {
		return SubscriptionStatus{}, err
	}

	return SubscriptionStatus{
		Status:        string(view.Status),
		Activated:     view.Activated,
		DeviceID:      view.DeviceID,
		ExpireAt:      view.ExpireAt,
		LastCheckedAt: view.LastCheckedAt,
		Message:       view.Message,
		Model:         view.Model,
		BaseURL:       view.BaseURL,
	}, nil
}

func (a *App) OpenSubscriptionPurchase() (SubscriptionPurchaseResult, error) {
	if err := a.requireContext(); err != nil {
		return SubscriptionPurchaseResult{}, err
	}
	if a.subscriptionService == nil {
		return SubscriptionPurchaseResult{
			Configured: false,
			Message:    "订阅服务未初始化",
		}, nil
	}

	link, err := a.subscriptionService.PurchaseLink()
	if err != nil {
		return SubscriptionPurchaseResult{}, err
	}
	if link.Configured && link.URL != "" {
		runtime.BrowserOpenURL(a.ctx, link.URL)
	}

	return SubscriptionPurchaseResult{
		Configured: link.Configured,
		URL:        link.URL,
		DeviceID:   link.DeviceID,
		Message:    link.Message,
	}, nil
}