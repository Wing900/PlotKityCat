package bridge

import (
	"context"
	"errors"

	"plotkitycat/internal/ai"
	"plotkitycat/internal/aicode/workflow"
	"plotkitycat/internal/appstate"
	"plotkitycat/internal/codeversions"
	"plotkitycat/internal/designcards"
	designai "plotkitycat/internal/designcards/ai"
	"plotkitycat/internal/designcards/session"
	"plotkitycat/internal/device"
	"plotkitycat/internal/env"
	filestore "plotkitycat/internal/files/store"
	"plotkitycat/internal/runner"
	"plotkitycat/internal/screening"
	"plotkitycat/internal/screeningzoom"
	settingspkg "plotkitycat/internal/settings"
	"plotkitycat/internal/subscription"
	"plotkitycat/internal/updater"
	"plotkitycat/internal/workspaces"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx                  context.Context
	aiService            *ai.Service
	aiWorkflow           *workflow.Service
	appStateStore        *appstate.Store
	codeVersionStore     *codeversions.Store
	designCardService    *designcards.Service
	designCardSession    *session.Service
	deviceService        *device.Service
	envManager           *env.Manager
	fileStore            *filestore.Store
	screeningZoomService *screeningzoom.Service
	runner               *runner.Runner
	screeningService     *screening.Service
	aiSettingsStore      *settingspkg.AIStore
	subscriptionService  *subscription.Service
	updateService        *updater.Service
	workspaceManager     *workspaces.Manager
}

func NewApp() *App {
	deviceService := device.NewService()
	subscriptionService := subscription.NewService(deviceService)
	workspaceManager := workspaces.NewManager()
	fileStore := filestore.NewStore(workspaceManager)
	designCardStore := designcards.NewStore(fileStore)
	screeningZoomService := screeningzoom.NewService()
	app := &App{
		aiService:            ai.NewService(subscriptionService),
		appStateStore:        appstate.NewStore(),
		codeVersionStore:     codeversions.NewStore(fileStore),
		designCardService:    designcards.NewService(designCardStore, designai.NewService(subscriptionService)),
		deviceService:        deviceService,
		envManager:           env.NewManager(workspaceManager),
		fileStore:            fileStore,
		screeningZoomService: screeningZoomService,
		runner:               runner.New(workspaceManager),
		aiSettingsStore:      settingspkg.NewAIStore(),
		subscriptionService:  subscriptionService,
		updateService:        updater.NewService(),
		workspaceManager:     workspaceManager,
	}
	app.screeningService = screening.NewService(workspaceManager, app.runner, screening.Callbacks{
		OnError: func(err error) {
			app.emit(EventRunFailed, RunErrorPayload{
				Error: err.Error(),
			})
		},
		OnContextMenu: func(sceneHwnd, ownerHwnd uintptr) {
			app.handleScreeningContextMenu(sceneHwnd, ownerHwnd)
		},
		DrawActive: func() bool {
			return app.screeningZoomService != nil && app.screeningZoomService.DrawActive()
		},
		ExitDraw: func() {
			if app.screeningZoomService != nil {
				app.screeningZoomService.ExitDraw()
			}
		},
		OnStateChanged: func(state screening.SessionState) {
			if state.Active && app.screeningZoomService != nil {
				_ = app.screeningZoomService.EnsureStarted()
			}
			app.emit(EventScreeningState, mapScreeningState(state))
		},
		OnStopped: func(state screening.SessionState) {
			if app.screeningZoomService != nil {
				_ = app.screeningZoomService.Stop()
			}
			app.emit(EventScreeningState, mapScreeningState(state))
		},
	})

	app.aiWorkflow = newAIWorkflowService(app)
	app.designCardSession = newDesignCardSessionService(app)
	return app
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) Shutdown(ctx context.Context) {
	a.runner.Shutdown()
	if a.screeningService != nil {
		_, _ = a.screeningService.Stop()
	}
	if a.screeningZoomService != nil {
		_ = a.screeningZoomService.Stop()
	}
}

func (a *App) emit(name string, payload any) {
	if a.ctx == nil {
		return
	}

	runtime.EventsEmit(a.ctx, name, payload)
}

func (a *App) requireContext() error {
	if a.ctx == nil {
		return errors.New("application context is not ready")
	}

	return nil
}
