package repair

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"

	"plotkitycat/internal/ai/provider"
)

type fakeLoader struct{ content string }

func (l *fakeLoader) Load(_ string) string { return l.content }

type fakeClient struct {
	resp  string
	err   error
	calls int
}

func (c *fakeClient) Chat(_ context.Context, _ provider.ChatRequest) (string, error) {
	c.calls++
	if c.err != nil {
		return "", c.err
	}
	return c.resp, nil
}

func newSvc(custom *fakeClient, sub *fakeClient) *Service {
	return NewService(provider.NewRouter(&fakeClient{}, custom, sub), &fakeLoader{content: "sys"})
}

func TestRepairCode_StripsFence(t *testing.T) {
	custom := &fakeClient{resp: "```python\nfixed()\n```"}
	svc := newSvc(custom, &fakeClient{})
	res, err := svc.RepairCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeCustom}})
	assert.NoError(t, err)
	assert.Equal(t, "fixed()", res.Patch)
	assert.Equal(t, "custom", res.Source)
}

func TestRepairCode_EmptyPatchErrors(t *testing.T) {
	custom := &fakeClient{resp: "```\n\n```"}
	svc := newSvc(custom, &fakeClient{})
	_, err := svc.RepairCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeCustom}})
	assert.ErrorContains(t, err, "没有返回可用补丁")
}

func TestRepairCode_PropagatesRouterError(t *testing.T) {
	custom := &fakeClient{err: errors.New("ai down")}
	svc := newSvc(custom, &fakeClient{})
	_, err := svc.RepairCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeCustom}})
	assert.ErrorContains(t, err, "ai down")
}

func TestBuildUserPrompt_IncludesErrorAndCode(t *testing.T) {
	prompt := buildUserPrompt(Request{SceneName: "scene.py", CurrentCode: "x=1", ErrorText: "NameError"})
	assert.Contains(t, prompt, "scene.py")
	assert.Contains(t, prompt, "NameError")
	assert.Contains(t, prompt, "x=1")
}

func TestStripFence_Variants(t *testing.T) {
	assert.Equal(t, "x = 1", StripFence("```\nx = 1\n```"))
	assert.Equal(t, "plain", StripFence("plain"))
	assert.Equal(t, "", StripFence("```"))
}
