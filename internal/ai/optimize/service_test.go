package optimize

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

func newSvc(custom *fakeClient, sub *fakeClient) *Service {
	return NewService(provider.NewRouter(custom, sub), &fakeLoader{content: "sys"})
}

func TestOptimizeCode_StripsFence(t *testing.T) {
	custom := &fakeClient{resp: "```python\nprint('patch')\n```"}
	svc := newSvc(custom, &fakeClient{})
	res, err := svc.OptimizeCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeCustom}})
	assert.NoError(t, err)
	assert.Equal(t, "print('patch')", res.Patch)
	assert.Equal(t, "custom", res.Source)
}

func TestOptimizeCode_EmptyPatchErrors(t *testing.T) {
	custom := &fakeClient{resp: "```\n\n```"}
	svc := newSvc(custom, &fakeClient{})
	_, err := svc.OptimizeCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeCustom}})
	assert.ErrorContains(t, err, "没有返回可用补丁")
}

func TestOptimizeCode_PropagatesRouterError(t *testing.T) {
	custom := &fakeClient{err: errors.New("ai down")}
	svc := newSvc(custom, &fakeClient{})
	_, err := svc.OptimizeCode(context.Background(), Request{Settings: provider.Settings{Mode: provider.ModeCustom}})
	assert.ErrorContains(t, err, "ai down")
}

func TestBuildUserPrompt_IncludesSceneAndInstruction(t *testing.T) {
	prompt := buildUserPrompt(Request{SceneName: "scene.py", CurrentCode: "x=1", Instruction: "make blue"})
	assert.Contains(t, prompt, "scene.py")
	assert.Contains(t, prompt, "make blue")
	assert.Contains(t, prompt, "x=1")
}

func TestResolvePromptPath_OptimizeSubdirectory(t *testing.T) {
	assert.Equal(t, "optimize\\custom.txt", resolvePromptPath(provider.ModeCustom))
	assert.Equal(t, "optimize\\subscription.txt", resolvePromptPath(provider.ModeSubscription))
}