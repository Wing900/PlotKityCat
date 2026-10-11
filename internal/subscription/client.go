package subscription

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 20 * time.Second},
	}
}

func (c *Client) Activate(ctx context.Context, request ActivationRequest) (ActivationResponse, error) {
	url := authURL()
	if url == "" {
		return ActivationResponse{
			Status:  StatusUnconfigured,
			Message: "订阅服务未配置",
		}, nil
	}

	payload, err := json.Marshal(request)
	if err != nil {
		return ActivationResponse{}, err
	}

	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		result, err := c.activateOnce(ctx, url, payload)
		if err == nil {
			return result, nil
		}
		lastErr = err
		if ctx.Err() != nil || attempt == 2 {
			break
		}
		delay := time.Duration(attempt+1) * 300 * time.Millisecond
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ActivationResponse{}, ctx.Err()
		case <-timer.C:
		}
	}
	return ActivationResponse{}, lastErr
}

func (c *Client) activateOnce(ctx context.Context, url string, payload []byte) (ActivationResponse, error) {
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return ActivationResponse{}, err
	}
	httpRequest.Header.Set("Content-Type", "application/json")

	response, err := c.httpClient.Do(httpRequest)
	if err != nil {
		return ActivationResponse{}, err
	}
	defer response.Body.Close()

	var result ActivationResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return ActivationResponse{}, err
	}

	if response.StatusCode >= 400 {
		message := strings.TrimSpace(result.Message)
		if message == "" {
			message = fmt.Sprintf("订阅激活失败：%s", response.Status)
		}
		return ActivationResponse{}, fmt.Errorf(message)
	}

	if result.BaseURL == "" {
		result.BaseURL = defaultAPIBaseURL()
	}
	if result.Model == "" {
		result.Model = defaultModelName()
	}

	return result, nil
}
