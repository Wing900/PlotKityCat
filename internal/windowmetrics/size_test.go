package windowmetrics

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMaxInt(t *testing.T) {
	assert.Equal(t, 5, maxInt(5, 3))
	assert.Equal(t, 7, maxInt(3, 7))
	assert.Equal(t, -1, maxInt(-1, -2))
}

func TestMinInt(t *testing.T) {
	assert.Equal(t, 3, minInt(5, 3))
	assert.Equal(t, 3, minInt(3, 7))
	assert.Equal(t, -2, minInt(-1, -2))
}

func TestClamp(t *testing.T) {
	assert.Equal(t, 5, clamp(5, 0, 10))   // 范围内
	assert.Equal(t, 0, clamp(-1, 0, 10))  // 低于下限
	assert.Equal(t, 10, clamp(11, 0, 10)) // 超过上限
	assert.Equal(t, 10, clamp(10, 0, 10)) // 边界
}

func TestFitToAvailable_ZeroAvailableReturnsCompact(t *testing.T) {
	assert.Equal(t, compactMinWindowWidth, fitToAvailable(0, 1000, compactMinWindowWidth, 2000))
	assert.Equal(t, compactMinWindowWidth, fitToAvailable(-5, 1000, compactMinWindowWidth, 2000))
}

func TestFitToAvailable_BelowCompactReturnsAvailable(t *testing.T) {
	// available (500) <= compactMinimum (960) -> 返回 available
	assert.Equal(t, 500, fitToAvailable(500, 1000, compactMinWindowWidth, 2000))
}

func TestFitToAvailable_ClampsPreferredBetweenCompactAndMax(t *testing.T) {
	// available=1500, preferred=1200, compactMin=960, max=1720
	// clamp(1200, 960, min(1500, 1720)=1500) = 1200
	assert.Equal(t, 1200, fitToAvailable(1500, 1200, compactMinWindowWidth, maxWindowWidth))
}

func TestFitToAvailable_CapsByAvailable(t *testing.T) {
	// preferred 超过 available -> 截到 available
	// available=1100, preferred=1500, compactMin=960, max=1720
	// clamp(1500, 960, min(1100, 1720)=1100) = 1100
	assert.Equal(t, 1100, fitToAvailable(1100, 1500, compactMinWindowWidth, maxWindowWidth))
}

func TestFitToAvailable_CapsByMaximum(t *testing.T) {
	// available 远超 max -> 截到 max
	// available=3000, preferred=2000, compactMin=960, max=1720
	// clamp(2000, 960, min(3000, 1720)=1720) = 1720
	assert.Equal(t, maxWindowWidth, fitToAvailable(3000, 2000, compactMinWindowWidth, maxWindowWidth))
}

func TestFallbackSize_Constants(t *testing.T) {
	s := fallbackSize()
	assert.Equal(t, 1320, s.Width)
	assert.Equal(t, 820, s.Height)
}