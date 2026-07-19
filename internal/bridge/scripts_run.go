package bridge

import (
	"errors"

	"plotkitycat/internal/runner"
)

func (a *App) SaveAndRun(filename string, code string) error {
	if err := a.requireContext(); err != nil {
		return err
	}
	if a.screeningService != nil && a.screeningService.State().Active {
		return errors.New("请先退出放映模式，再运行单个场景")
	}

	environment, err := a.GetEnvironmentStatus()
	if err != nil {
		return err
	}
	if !environment.Ready {
		return errors.New(environment.Summary)
	}

	savedName, err := a.fileStore.SaveScript(filename, code)
	if err != nil {
		return err
	}

	a.emit(EventScriptSaved, EventPayload{
		Filename: savedName,
		Message:  "script saved before run",
	})

	return a.runner.Run(savedName, runner.Request{
		OnStart: func() {
			a.emit(EventRunStarted, EventPayload{
				Filename: savedName,
				Message:  "python process started",
			})
		},
		OnReady: func() {
			a.emit(EventRunReady, EventPayload{
				Filename: savedName,
				Message:  "python visualization ready",
			})
		},
		OnFinish: func() {
			a.emit(EventRunFinished, EventPayload{
				Filename: savedName,
				Message:  "python process finished",
			})
		},
		OnStop: func() {
			a.emit(EventRunStopped, EventPayload{
				Filename: savedName,
				Message:  "python process stopped",
			})
		},
		OnError: func(runErr error) {
			var pythonErr *runner.RunError
			if errors.As(runErr, &pythonErr) {
				a.emit(EventRunFailed, RunErrorPayload{
					Filename:  savedName,
					ErrorType: pythonErr.Type,
					Traceback: pythonErr.Traceback,
					Error:     pythonErr.Error(),
				})
				return
			}

			a.emit(EventRunFailed, RunErrorPayload{
				Filename: savedName,
				Error:    runErr.Error(),
			})
		},
	})
}

func (a *App) StopCurrentRun() (RunControlResult, error) {
	if a.screeningService != nil && a.screeningService.State().Active {
		result, err := a.screeningService.Stop()
		if err != nil {
			return RunControlResult{}, err
		}
		return RunControlResult{
			Handled: result.Handled,
			Message: result.Message,
		}, nil
	}

	handled, err := a.runner.Stop()
	if err != nil {
		return RunControlResult{}, err
	}
	if !handled {
		return RunControlResult{
			Handled: false,
			Message: "当前没有正在运行的 Python 进程",
		}, nil
	}

	return RunControlResult{
		Handled: true,
		Message: "已发送终止当前 Python 进程的请求",
	}, nil
}