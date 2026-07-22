package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"plotkitycat/internal/paths"
)

type AIProviderSettings struct {
	Mode  string `json:"mode"`
	URL   string `json:"url"`
	Key   string `json:"key"`
	Model string `json:"model"`
}

type AIStore struct{}

func NewAIStore() *AIStore {
	return &AIStore{}
}

func (s *AIStore) Load() (AIProviderSettings, error) {
	path, err := paths.AISettingsPath()
	if err != nil {
		return defaultAIProviderSettings(), err
	}

	content, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return defaultAIProviderSettings(), nil
		}

		return defaultAIProviderSettings(), err
	}

	var value AIProviderSettings
	if err := json.Unmarshal(content, &value); err != nil {
		return defaultAIProviderSettings(), err
	}

	return normalizeAIProviderSettings(value), nil
}

func (s *AIStore) Save(value AIProviderSettings) (AIProviderSettings, error) {
	path, err := paths.AISettingsPath()
	if err != nil {
		return defaultAIProviderSettings(), err
	}

	normalized := normalizeAIProviderSettings(value)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return defaultAIProviderSettings(), err
	}

	content, err := json.MarshalIndent(normalized, "", "  ")
	if err != nil {
		return defaultAIProviderSettings(), err
	}

	if err := os.WriteFile(path, append(content, '\n'), 0o644); err != nil {
		return defaultAIProviderSettings(), err
	}

	return normalized, nil
}

func defaultAIProviderSettings() AIProviderSettings {
	return AIProviderSettings{
		Mode:  "free",
		URL:   "",
		Key:   "",
		Model: "",
	}
}

func normalizeAIProviderSettings(value AIProviderSettings) AIProviderSettings {
	mode := strings.TrimSpace(value.Mode)
	if mode != "free" && mode != "subscription" {
		mode = "custom"
	}

	return AIProviderSettings{
		Mode:  mode,
		URL:   strings.TrimSpace(value.URL),
		Key:   strings.TrimSpace(value.Key),
		Model: strings.TrimSpace(value.Model),
	}
}
