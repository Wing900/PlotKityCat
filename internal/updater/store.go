package updater

import (
	"encoding/json"
	"os"

	"plotkitycat/internal/atomicfile"
	"plotkitycat/internal/paths"
)

type Store struct{}

func NewStore() *Store {
	return &Store{}
}

func (s *Store) Load() (State, error) {
	path, err := paths.UpdateStatePath()
	if err != nil {
		return State{}, err
	}

	content, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return State{}, nil
		}

		return State{}, err
	}

	var state State
	if err := json.Unmarshal(content, &state); err != nil {
		return State{}, err
	}

	return state, nil
}

func (s *Store) Save(state State) error {
	path, err := paths.UpdateStatePath()
	if err != nil {
		return err
	}

	content, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}

	return atomicfile.Write(path, append(content, '\n'), 0o600)
}
