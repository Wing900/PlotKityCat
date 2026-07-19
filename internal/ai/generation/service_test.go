package generation

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"

	"plotkitycat/internal/ai/provider"
)

type fakeLoader struct{ content string }

func (l *fakeLoader) Load(_ string) string { return l.content }

func newSvc(custom *fakeClient, sub *fakeClient) *Service {
	return NewService(provider.NewRouter(custom, sub), &fakeLoader{content: "sys"})
}

type fakeClient struct {
	resp string
	err  error
	calls int
}

func (c *fakeClient) Chat(_ context.Context, _ provider.ChatRequest) (string, error) {
	c.calls++
	if c.err != nil {
		return "", c.err
	}
	return c.resp, nil
}

func TestGenerateCode_ExtractsFencedCode(t *testing.T) {
	custom := &fakeClient{resp: "前缀\n```python\nprint('hi')\n```\n后缀"}
	svc := newSvc(custom, &fakeClient{})
	res, err := svc.GenerateCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeCustom}})
	assert.NoError(t, err)
	assert.Equal(t, "print('hi')", res.Code)
	assert.Equal(t, "custom", res.Source)
}

func TestGenerateCode_NoFenceReturnsTrimmed(t *testing.T) {
	custom := &fakeClient{resp: "  bare code  "}
	svc := newSvc(custom, &fakeClient{})
	res, err := svc.GenerateCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeCustom}})
	assert.NoError(t, err)
	assert.Equal(t, "bare code", res.Code)
}

func TestGenerateCode_PropagatesRouterError(t *testing.T) {
	custom := &fakeClient{err: errors.New("ai down")}
	svc := newSvc(custom, &fakeClient{})
	_, err := svc.GenerateCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeCustom}})
	assert.ErrorContains(t, err, "ai down")
}

func TestGenerateCode_SubscriptionModeHitsSubClient(t *testing.T) {
	sub := &fakeClient{resp: "```python\nsub code\n```"}
	custom := &fakeClient{}
	svc := newSvc(custom, sub)
	res, err := svc.GenerateCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeSubscription}})
	assert.NoError(t, err)
	assert.Equal(t, "sub code", res.Code)
	assert.Equal(t, 0, custom.calls)
	assert.Equal(t, 1, sub.calls)
}

func TestExtractCode_FenceOnlyStrips(t *testing.T) {
	assert.Equal(t, "x = 1", extractCode("```\nx = 1\n```"))
	assert.Equal(t, "", extractCode("```"))
	assert.Equal(t, "plain", extractCode("plain"))
}