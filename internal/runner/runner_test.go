package runner

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRunError_WithTraceback(t *testing.T) {
	e := &RunError{Type: "ValueError", Traceback: "trace here"}
	assert.Equal(t, "ValueError\ntrace here", e.Error())
}

func TestRunError_WithErrFallback(t *testing.T) {
	e := &RunError{Type: "PythonError", Err: errors.New("boom")}
	assert.Equal(t, "PythonError: boom", e.Error())
}

func TestRunError_TypeOnly(t *testing.T) {
	e := &RunError{Type: "UnknownError"}
	assert.Equal(t, "UnknownError", e.Error())
}

func TestDetectPythonErrorType_FindsErrorSuffix(t *testing.T) {
	stderr := "  File \"x.py\", line 3\n    print(\n         ^\nSyntaxError: invalid syntax"
	got := detectPythonErrorType(stderr, errors.New("fallback"))
	assert.Equal(t, "SyntaxError", got)
}

func TestDetectPythonErrorType_FindsExceptionSuffix(t *testing.T) {
	stderr := "Traceback:\nValueError: invalid value"
	got := detectPythonErrorType(stderr, nil)
	assert.Equal(t, "ValueError", got)
}

func TestDetectPythonErrorType_NoMatchReturnsFallback(t *testing.T) {
	stderr := "just some output, no error line"
	got := detectPythonErrorType(stderr, errors.New("FallbackErr"))
	assert.Equal(t, "FallbackErr", got)
}

func TestDetectPythonErrorType_NoMatchNoFallbackReturnsDefault(t *testing.T) {
	got := detectPythonErrorType("plain output", nil)
	assert.Equal(t, "PythonError", got)
}

func TestDetectPythonErrorType_EmptyStderr(t *testing.T) {
	got := detectPythonErrorType("", errors.New("fb"))
	assert.Equal(t, "fb", got)
}

func TestTail_EmptyInput(t *testing.T) {
	assert.Equal(t, "", tail("", 5))
}

func TestTail_FewerLinesThanLimit(t *testing.T) {
	input := "a\nb\nc"
	assert.Equal(t, input, tail(input, 5))
}

func TestTail_TruncatesToLastNLines(t *testing.T) {
	input := "1\n2\n3\n4\n5"
	assert.Equal(t, "3\n4\n5", tail(input, 3))
}

func TestTail_ExactLimit(t *testing.T) {
	input := "1\n2\n3"
	assert.Equal(t, input, tail(input, 3))
}

func TestBuildPythonEnv_SetsQtAndMatplotlibEnv(t *testing.T) {
	env := BuildPythonEnv("/fake/runtime")
	keys := map[string]string{}
	for _, e := range env {
		// 只取第一个 = 后的键值
		for i := 0; i < len(e); i++ {
			if e[i] == '=' {
				keys[e[:i]] = e[i+1:]
				break
			}
		}
	}
	assert.Equal(t, "Qt5Agg", keys["MPLBACKEND"])
	assert.Contains(t, keys["PLOTKITYCAT_RUN_READY_SENTINEL"], runReadySentinel)
	assert.Contains(t, keys["QT_QPA_PLATFORM_PLUGIN_PATH"], "platforms")
	assert.Contains(t, keys["QT_PLUGIN_PATH"], "plugins")
	assert.Contains(t, keys["PATH"], "bin")
}