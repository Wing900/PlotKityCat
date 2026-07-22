package settings

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalize_DefaultsToCustomMode(t *testing.T) {
	got := normalizeAIProviderSettings(AIProviderSettings{Mode: ""})
	assert.Equal(t, "custom", got.Mode)
}

func TestNormalize_PreservesSubscriptionMode(t *testing.T) {
	got := normalizeAIProviderSettings(AIProviderSettings{Mode: "subscription", URL: "u", Key: "k", Model: "m"})
	assert.Equal(t, "subscription", got.Mode)
	assert.Equal(t, "u", got.URL)
}

func TestNormalize_PreservesFreeMode(t *testing.T) {
	got := normalizeAIProviderSettings(AIProviderSettings{Mode: "free"})
	assert.Equal(t, "free", got.Mode)
}

func TestNormalize_NonSubscriptionBecomesCustom(t *testing.T) {
	assert.Equal(t, "custom", normalizeAIProviderSettings(AIProviderSettings{Mode: "weird"}).Mode)
	assert.Equal(t, "custom", normalizeAIProviderSettings(AIProviderSettings{Mode: "custom"}).Mode)
}

func TestNormalize_TrimsWhitespace(t *testing.T) {
	got := normalizeAIProviderSettings(AIProviderSettings{
		Mode: "  subscription  ", URL: "  http://x  ", Key: "  k  ", Model: "  gpt  ",
	})
	assert.Equal(t, "subscription", got.Mode)
	assert.Equal(t, "http://x", got.URL)
	assert.Equal(t, "k", got.Key)
	assert.Equal(t, "gpt", got.Model)
}

func TestDefaultAIProviderSettings(t *testing.T) {
	got := defaultAIProviderSettings()
	assert.Equal(t, "free", got.Mode)
	assert.Empty(t, got.URL)
	assert.Empty(t, got.Key)
	assert.Empty(t, got.Model)
}
