package device

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

type Service struct {
	guidProvider func() (string, error)
}

func NewService() *Service {
	return &Service{guidProvider: machineGuid}
}

// NewServiceWithProvider 仅供测试注入 guid 来源, 生产代码用 NewService.
func NewServiceWithProvider(provider func() (string, error)) *Service {
	return &Service{guidProvider: provider}
}

func (s *Service) ID() (string, error) {
	value, err := s.guidProvider()
	if err != nil {
		return "", err
	}

	normalized := strings.TrimSpace(strings.ToLower(value))
	sum := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(sum[:]), nil
}