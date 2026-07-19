package bridge

import (
	filestore "plotkitycat/internal/files/store"
)

func (a *App) GetScriptNote(filename string) (NoteDocument, error) {
	note, err := a.fileStore.ReadNote(filename)
	if err != nil {
		return NoteDocument{}, err
	}

	return NoteDocument{
		Markdown: note.Markdown,
		Images:   mapNoteImages(note.Images),
	}, nil
}

func (a *App) SaveScriptNote(filename string, markdown string) error {
	return a.fileStore.SaveNote(filename, markdown)
}

func (a *App) AddScriptNoteImages(filename string, images []NoteImageInput) (NoteDocument, error) {
	nextImages := make([]filestore.NoteImage, 0, len(images))
	for _, image := range images {
		nextImages = append(nextImages, filestore.NoteImage{
			Name:    image.Name,
			Alt:     image.Alt,
			DataURL: image.DataURL,
		})
	}

	note, err := a.fileStore.AddNoteImages(filename, nextImages)
	if err != nil {
		return NoteDocument{}, err
	}

	return NoteDocument{
		Markdown: note.Markdown,
		Images:   mapNoteImages(note.Images),
	}, nil
}

func (a *App) RemoveScriptNoteImage(filename string, relativePath string) (NoteDocument, error) {
	note, err := a.fileStore.RemoveNoteImage(filename, relativePath)
	if err != nil {
		return NoteDocument{}, err
	}

	return NoteDocument{
		Markdown: note.Markdown,
		Images:   mapNoteImages(note.Images),
	}, nil
}

func mapNoteImages(images []filestore.NoteImage) []NoteImage {
	mapped := make([]NoteImage, 0, len(images))
	for _, image := range images {
		mapped = append(mapped, NoteImage{
			Name:         image.Name,
			Alt:          image.Alt,
			DataURL:      image.DataURL,
			RelativePath: image.RelativePath,
		})
	}

	return mapped
}