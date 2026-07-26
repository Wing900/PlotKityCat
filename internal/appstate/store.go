package appstate

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"plotkitycat/internal/atomicfile"
	"plotkitycat/internal/paths"
)

const (
	SchemaVersion         = 2
	maxOnboardingVersion  = 64
	maxOnboardingLastStep = 10_000
)

const (
	OnboardingUnseen     = "unseen"
	OnboardingStarted    = "started"
	OnboardingDismissed  = "dismissed"
	OnboardingCompleted  = "completed"
	OnboardingSuppressed = "suppressed"
)

const (
	SuppressedExistingUser    = "existing-user"
	SuppressedTemplateMissing = "template-missing"
)

type OnboardingState struct {
	Version           string `json:"version"`
	Status            string `json:"status"`
	LastStep          int    `json:"lastStep"`
	SuppressionReason string `json:"suppressionReason,omitempty"`
	UpdatedAt         string `json:"updatedAt,omitempty"`
}

type State struct {
	SchemaVersion int             `json:"schemaVersion"`
	Onboarding    OnboardingState `json:"onboarding"`
}

type Store struct {
	mu                    sync.Mutex
	hadHistoricalUserData bool
}

func NewStore() *Store {
	return &Store{
		hadHistoricalUserData: detectHistoricalUserData(),
	}
}

func (s *Store) LoadOnboarding() (OnboardingState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, err := load()
	if err != nil {
		return defaultOnboardingState(), err
	}

	return normalizeOnboardingState(state.Onboarding), nil
}

func (s *Store) SaveOnboarding(version string, status string, lastStep int) (OnboardingState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	normalized, err := validateOnboardingState(OnboardingState{
		Version:  version,
		Status:   status,
		LastStep: lastStep,
	})
	if err != nil {
		return defaultOnboardingState(), err
	}
	normalized.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	state, err := load()
	if err != nil {
		return defaultOnboardingState(), err
	}
	current := normalizeOnboardingState(state.Onboarding)
	if current.Status == OnboardingSuppressed {
		return current, nil
	}
	if current.Version == normalized.Version {
		if current.Status == OnboardingCompleted &&
			normalized.Status != OnboardingCompleted {
			return current, nil
		}
		if current.Status == OnboardingDismissed &&
			normalized.Status == OnboardingStarted {
			return current, nil
		}
	}
	state.SchemaVersion = SchemaVersion
	state.Onboarding = normalized

	if err := save(state); err != nil {
		return defaultOnboardingState(), err
	}

	return normalized, nil
}

func (s *Store) ResolveOnboarding(version string, templateAvailable bool) (OnboardingState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, err := load()
	if err != nil {
		return defaultOnboardingState(), err
	}
	current := normalizeOnboardingState(state.Onboarding)
	if current.Status != OnboardingUnseen {
		return current, nil
	}

	reason := ""
	switch {
	case s.hadHistoricalUserData:
		reason = SuppressedExistingUser
	case !templateAvailable:
		reason = SuppressedTemplateMissing
	default:
		return current, nil
	}

	current, err = validateOnboardingState(OnboardingState{
		Version:           version,
		Status:            OnboardingSuppressed,
		SuppressionReason: reason,
	})
	if err != nil {
		return defaultOnboardingState(), err
	}
	current.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	state.SchemaVersion = SchemaVersion
	state.Onboarding = current
	if err := save(state); err != nil {
		return defaultOnboardingState(), err
	}
	return current, nil
}

func load() (State, error) {
	path, err := paths.AppStatePath()
	if err != nil {
		return State{}, err
	}

	content, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return State{
				SchemaVersion: SchemaVersion,
				Onboarding:    defaultOnboardingState(),
			}, nil
		}
		return State{}, err
	}

	var state State
	if err := json.Unmarshal(content, &state); err != nil {
		return State{}, fmt.Errorf("decode app state: %w", err)
	}

	if state.SchemaVersion <= 0 {
		state.SchemaVersion = SchemaVersion
	}
	if state.SchemaVersion > SchemaVersion {
		return State{}, fmt.Errorf(
			"unsupported app state schema version %d",
			state.SchemaVersion,
		)
	}
	state.Onboarding = normalizeOnboardingState(state.Onboarding)
	return state, nil
}

func save(state State) error {
	path, err := paths.AppStatePath()
	if err != nil {
		return err
	}

	content, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	content = append(content, '\n')

	return atomicfile.Write(path, content, 0o600)
}

func defaultOnboardingState() OnboardingState {
	return OnboardingState{
		Status: OnboardingUnseen,
	}
}

func normalizeOnboardingState(state OnboardingState) OnboardingState {
	status := strings.TrimSpace(state.Status)
	switch status {
	case OnboardingStarted, OnboardingDismissed, OnboardingCompleted, OnboardingSuppressed:
	default:
		status = OnboardingUnseen
	}
	suppressionReason := normalizeSuppressionReason(status, state.SuppressionReason)
	if status == OnboardingSuppressed && suppressionReason == "" {
		status = OnboardingUnseen
	}

	lastStep := state.LastStep
	if lastStep < 0 {
		lastStep = 0
	}

	return OnboardingState{
		Version:           strings.TrimSpace(state.Version),
		Status:            status,
		LastStep:          lastStep,
		SuppressionReason: suppressionReason,
		UpdatedAt:         strings.TrimSpace(state.UpdatedAt),
	}
}

func validateOnboardingState(state OnboardingState) (OnboardingState, error) {
	normalized := normalizeOnboardingState(state)
	if normalized.Version == "" {
		return OnboardingState{}, fmt.Errorf("onboarding version is empty")
	}
	if len(normalized.Version) > maxOnboardingVersion {
		return OnboardingState{}, fmt.Errorf("onboarding version is too long")
	}
	if normalized.Status != strings.TrimSpace(state.Status) {
		return OnboardingState{}, fmt.Errorf("invalid onboarding status %q", state.Status)
	}
	if normalized.LastStep > maxOnboardingLastStep {
		return OnboardingState{}, fmt.Errorf("onboarding last step is too large")
	}
	if normalized.Status == OnboardingSuppressed && normalized.SuppressionReason == "" {
		return OnboardingState{}, fmt.Errorf("onboarding suppression reason is empty")
	}
	return normalized, nil
}

func normalizeSuppressionReason(status string, reason string) string {
	if status != OnboardingSuppressed {
		return ""
	}
	switch strings.TrimSpace(reason) {
	case SuppressedExistingUser, SuppressedTemplateMissing:
		return strings.TrimSpace(reason)
	default:
		return ""
	}
}

func detectHistoricalUserData() bool {
	appStatePath, err := paths.AppStatePath()
	if err != nil {
		return false
	}
	if _, err := os.Stat(appStatePath); err == nil {
		// app-state.json 是新手引导状态的唯一来源；文件存在时直接服从其状态。
		return false
	} else if !os.IsNotExist(err) {
		return true
	}

	configDir, err := paths.ConfigDir()
	if err != nil {
		return false
	}
	entries, err := os.ReadDir(configDir)
	if os.IsNotExist(err) {
		return false
	}
	if err != nil {
		return true
	}
	return len(entries) > 0
}
