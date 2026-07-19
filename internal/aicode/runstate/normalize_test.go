package runstate

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeExecutionResult_ReadyReturnsNil(t *testing.T) {
	assert.Nil(t, NormalizeExecutionResult(ExecutionResult{Status: ExecutionStatusReady}))
}

func TestNormalizeExecutionResult_InterruptedNotRepairable(t *testing.T) {
	f := NormalizeExecutionResult(ExecutionResult{Status: ExecutionStatusInterrupted})
	assert.NotNil(t, f)
	assert.Equal(t, FailureKindInterrupted, f.Kind)
	assert.False(t, f.Repairable)
	assert.Equal(t, "已中断 AI 检查", f.ErrorText)
}

func TestNormalizeExecutionResult_InterruptedKeepsCustomErrorText(t *testing.T) {
	f := NormalizeExecutionResult(ExecutionResult{Status: ExecutionStatusInterrupted, ErrorText: "custom"})
	assert.Equal(t, "custom", f.ErrorText)
}

func TestNormalizeExecutionResult_FinishedRepairable(t *testing.T) {
	f := NormalizeExecutionResult(ExecutionResult{Status: ExecutionStatusFinished})
	assert.Equal(t, FailureKindNoReady, f.Kind)
	assert.True(t, f.Repairable)
	assert.Contains(t, f.ErrorText, "没有弹出可视化窗口")
}

func TestNormalizeExecutionResult_FailedDefaultsToRunError(t *testing.T) {
	f := NormalizeExecutionResult(ExecutionResult{Status: ExecutionStatusFailed})
	assert.Equal(t, FailureKindRunError, f.Kind)
	assert.True(t, f.Repairable)
	assert.Contains(t, f.ErrorText, "Python 进程异常退出")
}

func TestNormalizeExecutionResult_FailedKeepsCustomErrorText(t *testing.T) {
	f := NormalizeExecutionResult(ExecutionResult{Status: ExecutionStatusFailed, ErrorText: "traceback..."})
	assert.Equal(t, "traceback...", f.ErrorText)
}

func TestDefaultErrorText_Fallback(t *testing.T) {
	assert.Equal(t, "fallback", defaultErrorText("", "fallback"))
	assert.Equal(t, "keep", defaultErrorText("keep", "fallback"))
}