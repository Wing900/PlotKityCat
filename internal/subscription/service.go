package subscription

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"plotkitycat/internal/version"
)

type DeviceIDProvider interface {
	ID() (string, error)
}

type Service struct {
	client           *Client
	deviceIDProvider DeviceIDProvider
	store            *Store
}

func NewService(deviceIDProvider DeviceIDProvider) *Service {
	return &Service{
		client:           NewClient(),
		deviceIDProvider: deviceIDProvider,
		store:            NewStore(),
	}
}

func (s *Service) Status(ctx context.Context, force bool) (View, error) {
	state, err := s.resolveState(ctx, force)
	if err != nil {
		return View{}, err
	}

	return stateToView(state), nil
}

func (s *Service) Session(ctx context.Context, force bool) (Session, error) {
	state, err := s.resolveState(ctx, force)
	if err != nil {
		return Session{}, err
	}

	if state.Status != StatusActive || strings.TrimSpace(state.Token) == "" {
		message := strings.TrimSpace(state.Message)
		if message == "" {
			message = "订阅未激活"
		}
		return Session{}, fmt.Errorf(message)
	}

	return Session{
		Token:    state.Token,
		BaseURL:  state.BaseURL,
		Model:    state.Model,
		DeviceID: state.DeviceID,
	}, nil
}

func (s *Service) PurchaseLink() (PurchaseLink, error) {
	state, err := s.store.Load()
	if err != nil {
		return PurchaseLink{}, err
	}

	deviceID, stateChanged, err := s.resolveDeviceID(&state)
	if err != nil {
		return PurchaseLink{
			Configured: false,
			Message:    "设备识别服务未就绪",
		}, nil
	}
	if stateChanged {
		if err := s.store.Save(state); err != nil {
			return PurchaseLink{}, err
		}
	}

	url, err := buildPurchaseURL(purchaseURL(), deviceID)
	if err != nil {
		return PurchaseLink{}, err
	}
	if strings.TrimSpace(url) == "" {
		return PurchaseLink{
			Configured: false,
			DeviceID:   deviceID,
			Message:    "购买链接未配置",
		}, nil
	}

	return PurchaseLink{
		Configured: true,
		URL:        url,
		DeviceID:   deviceID,
		Message:    "已打开购买页面，完成支付后请刷新激活状态",
	}, nil
}

func (s *Service) resolveState(ctx context.Context, force bool) (CacheState, error) {
	state, err := s.store.Load()
	if err != nil {
		return CacheState{}, err
	}

	deviceID, stateChanged, err := s.resolveDeviceID(&state)
	if err != nil {
		return CacheState{
			Status:  StatusError,
			Message: "设备识别服务未就绪",
		}, nil
	}
	state.DeviceID = deviceID
	if strings.TrimSpace(state.InstallID) == "" {
		state.InstallID = uuid.NewString()
		stateChanged = true
	}
	if stateChanged {
		if err := s.store.Save(state); err != nil {
			return CacheState{}, err
		}
	}

	if !force && s.canUseCache(state) {
		return state, nil
	}

	response, err := s.client.Activate(ctx, ActivationRequest{
		DeviceID:   state.DeviceID,
		InstallID:  state.InstallID,
		AppVersion: version.Current(),
	})
	if err != nil {
		if hasUsableToken(state) {
			state.Status = StatusActive
			state.Message = "订阅状态刷新失败，正在使用有效缓存：" + err.Error()
			_ = s.store.Save(state)
			return state, nil
		}
		if state.Status != "" {
			state.Message = err.Error()
			state.Status = StatusError
			_ = s.store.Save(state)
			return state, nil
		}
		return CacheState{}, err
	}

	now := time.Now().UTC().Format(time.RFC3339)
	state.LastCheckedAt = now
	state.Status = response.Status
	state.Message = strings.TrimSpace(response.Message)
	state.ExpireAt = response.ExpireAt
	state.BaseURL = firstNonEmpty(response.BaseURL, state.BaseURL, defaultAPIBaseURL())
	state.Model = firstNonEmpty(response.Model, state.Model, defaultModelName())

	if response.Status == StatusActive {
		state.Token = response.Token
	} else {
		state.Token = ""
	}

	if err := s.store.Save(state); err != nil {
		return CacheState{}, err
	}

	return state, nil
}

func hasUsableToken(state CacheState) bool {
	if strings.TrimSpace(state.Token) == "" {
		return false
	}
	expireAt, err := time.Parse(time.RFC3339, state.ExpireAt)
	return err == nil && time.Until(expireAt) > 0
}

func (s *Service) resolveDeviceID(state *CacheState) (string, bool, error) {
	if state != nil {
		if deviceID := strings.TrimSpace(state.DeviceID); deviceID != "" {
			state.DeviceID = deviceID
			return deviceID, false, nil
		}
	}
	if s.deviceIDProvider == nil {
		return "", false, fmt.Errorf("device id provider is nil")
	}

	deviceID, err := s.deviceIDProvider.ID()
	if err != nil {
		return "", false, err
	}
	deviceID = strings.TrimSpace(deviceID)
	if state != nil {
		state.DeviceID = deviceID
	}
	return deviceID, true, nil
}

func (s *Service) canUseCache(state CacheState) bool {
	if strings.TrimSpace(state.DeviceID) == "" || strings.TrimSpace(state.LastCheckedAt) == "" {
		return false
	}

	if state.Status == StatusUnconfigured {
		return true
	}

	if state.Status != StatusActive || strings.TrimSpace(state.Token) == "" {
		return false
	}

	lastCheckedAt, err := time.Parse(time.RFC3339, state.LastCheckedAt)
	if err != nil {
		return false
	}
	if time.Since(lastCheckedAt) > cacheTTL() {
		return false
	}

	expireAt, err := time.Parse(time.RFC3339, state.ExpireAt)
	if err != nil {
		return false
	}

	return time.Until(expireAt) > 0
}

func stateToView(state CacheState) View {
	return View{
		Status:        state.Status,
		Activated:     state.Status == StatusActive && strings.TrimSpace(state.Token) != "",
		DeviceID:      state.DeviceID,
		ExpireAt:      state.ExpireAt,
		LastCheckedAt: state.LastCheckedAt,
		Message:       state.Message,
		Model:         state.Model,
		BaseURL:       state.BaseURL,
	}
}
