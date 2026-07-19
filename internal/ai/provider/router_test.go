package provider

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

type fakeChat struct {
	resp string
	err  error
	calls int
	lastReq ChatRequest
}

func (c *fakeChat) Chat(_ context.Context, req ChatRequest) (string, error) {
	c.calls++
	c.lastReq = req
	if c.err != nil {
		return "", c.err
	}
	return c.resp, nil
}

func TestRouter_DispatchByMode(t *testing.T) {
	custom := &fakeChat{resp: "from-custom"}
	sub := &fakeChat{resp: "from-subscription"}
	r := NewRouter(custom, sub)

	out, err := r.Chat(context.Background(), ChatRequest{Settings: Settings{Mode: ModeCustom}})
	assert.NoError(t, err)
	assert.Equal(t, "from-custom", out)
	assert.Equal(t, 1, custom.calls)
	assert.Equal(t, 0, sub.calls)

	out, err = r.Chat(context.Background(), ChatRequest{Settings: Settings{Mode: ModeSubscription}})
	assert.NoError(t, err)
	assert.Equal(t, "from-subscription", out)
	assert.Equal(t, 1, custom.calls) // subscription 调用未动 custom
	assert.Equal(t, 1, sub.calls)
}

func TestRouter_PropagatesError(t *testing.T) {
	custom := &fakeChat{err: errors.New("network down")}
	r := NewRouter(custom, &fakeChat{})
	_, err := r.Chat(context.Background(), ChatRequest{Settings: Settings{Mode: ModeCustom}})
	assert.ErrorContains(t, err, "network down")
}

func TestRouter_PassesRequestThrough(t *testing.T) {
	custom := &fakeChat{resp: "ok"}
	r := NewRouter(custom, &fakeChat{})
	req := ChatRequest{Settings: Settings{Mode: ModeCustom, Model: "gpt-x"}, SystemPrompt: "sys", UserPrompt: "usr"}
	r.Chat(context.Background(), req)
	assert.Equal(t, "gpt-x", custom.lastReq.Settings.Model)
	assert.Equal(t, "sys", custom.lastReq.SystemPrompt)
	assert.Equal(t, "usr", custom.lastReq.UserPrompt)
}