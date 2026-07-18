package bridge

import (
	"errors"

	"plotkitycat/internal/aicode/operations"
	"plotkitycat/internal/aicode/workflow"
	"plotkitycat/internal/designcards/session"
	"plotkitycat/internal/runner"
)

func newDesignCardSessionService(app *App) *session.Service {
	return session.NewService(designCardBuilder{service: app.designCardService}, newDesignCardEventSink(app))
}

func newAIWorkflowService(app *App) *workflow.Service {
	builder := operations.NewService(app.aiService)
	executor := workflow.NewRunnerExecutor(
		newAIWorkflowEnvironmentGuard(app).EnsureReady,
		newAIWorkflowSceneSaver(app).SaveScene,
		newAIWorkflowRunnerAdapter(app).StartRun,
		newAIWorkflowRunnerAdapter(app).StopRun,
	)

	return workflow.NewService(builder, executor, newAIWorkflowEventSink(app))
}

type aiWorkflowEnvironmentGuard struct {
	app *App
}

func newAIWorkflowEnvironmentGuard(app *App) aiWorkflowEnvironmentGuard {
	return aiWorkflowEnvironmentGuard{app: app}
}

func (g aiWorkflowEnvironmentGuard) EnsureReady() error {
	environment, err := g.app.GetEnvironmentStatus()
	if err != nil {
		return err
	}
	if !environment.Ready {
		return errors.New(environment.Summary)
	}

	return nil
}

type aiWorkflowSceneSaver struct {
	app *App
}

func newAIWorkflowSceneSaver(app *App) aiWorkflowSceneSaver {
	return aiWorkflowSceneSaver{app: app}
}

func (s aiWorkflowSceneSaver) SaveScene(sceneName string, code string) error {
	_, err := s.app.fileStore.SaveScript(sceneName, code)
	if err == nil {
		s.app.emit(EventScriptSaved, EventPayload{
			Filename: sceneName,
			Message:  "script saved before AI workflow run",
		})
	}

	return err
}

type aiWorkflowRunnerAdapter struct {
	app *App
}

func newAIWorkflowRunnerAdapter(app *App) aiWorkflowRunnerAdapter {
	return aiWorkflowRunnerAdapter{app: app}
}

func (a aiWorkflowRunnerAdapter) StartRun(sceneName string, callbacks workflow.RunnerCallbacks) error {
	return a.app.runner.Run(sceneName, runner.Request{
		OnStart: func() {
			a.app.emit(EventRunStarted, EventPayload{
				Filename: sceneName,
				Message:  "python process started",
			})
			if callbacks.OnStart != nil {
				callbacks.OnStart()
			}
		},
		OnReady: func() {
			a.app.emit(EventRunReady, EventPayload{
				Filename: sceneName,
				Message:  "python visualization ready",
			})
			if callbacks.OnReady != nil {
				callbacks.OnReady()
			}
		},
		OnFinish: func() {
			a.app.emit(EventRunFinished, EventPayload{
				Filename: sceneName,
				Message:  "python process finished",
			})
			if callbacks.OnFinish != nil {
				callbacks.OnFinish()
			}
		},
		OnStop: func() {
			a.app.emit(EventRunStopped, EventPayload{
				Filename: sceneName,
				Message:  "python process stopped",
			})
			if callbacks.OnStop != nil {
				callbacks.OnStop()
			}
		},
		OnError: func(runErr error) {
			a.emitRunFailure(sceneName, runErr)
			if callbacks.OnError != nil {
				callbacks.OnError(runErr)
			}
		},
	})
}

func (a aiWorkflowRunnerAdapter) StopRun() error {
	_, err := a.app.runner.Stop()
	return err
}

func (a aiWorkflowRunnerAdapter) emitRunFailure(sceneName string, runErr error) {
	var pythonErr *runner.RunError
	if errors.As(runErr, &pythonErr) {
		a.app.emit(EventRunFailed, RunErrorPayload{
			Filename:  sceneName,
			ErrorType: pythonErr.Type,
			Traceback: pythonErr.Traceback,
			Error:     pythonErr.Error(),
		})
		return
	}

	a.app.emit(EventRunFailed, RunErrorPayload{
		Filename: sceneName,
		Error:    runErr.Error(),
	})
}
