package instancelock

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAcquire_GrabsPort(t *testing.T) {
	lock, err := Acquire()
	require.NoError(t, err)
	require.NotNil(t, lock)
	defer lock.Release()
	// 再 Acquire 应失败 (端口已被占)
	second, err := Acquire()
	assert.Error(t, err)
	assert.Nil(t, second)
}

func TestRelease_ClosesListener(t *testing.T) {
	lock, err := Acquire()
	require.NoError(t, err)
	require.NoError(t, lock.Release())
	// 重复 Release 幂等
	require.NoError(t, lock.Release())
}

func TestRelease_NilSafe(t *testing.T) {
	var lock *Lock
	assert.NoError(t, lock.Release())
}