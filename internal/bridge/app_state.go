package bridge

func (a *App) GetOnboardingState() (OnboardingState, error) {
	state, err := a.appStateStore.LoadOnboarding()
	if err != nil {
		return OnboardingState{}, err
	}
	return mapOnboardingState(state.Version, state.Status, state.LastStep, state.UpdatedAt), nil
}

func (a *App) UpdateOnboardingState(version string, status string, lastStep int) (OnboardingState, error) {
	state, err := a.appStateStore.SaveOnboarding(version, status, lastStep)
	if err != nil {
		return OnboardingState{}, err
	}
	return mapOnboardingState(state.Version, state.Status, state.LastStep, state.UpdatedAt), nil
}

func mapOnboardingState(version string, status string, lastStep int, updatedAt string) OnboardingState {
	return OnboardingState{
		Version:   version,
		Status:    status,
		LastStep:  lastStep,
		UpdatedAt: updatedAt,
	}
}
