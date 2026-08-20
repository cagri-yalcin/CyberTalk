import React, {
    useState,
} from 'react';

const DEMO_GIFS = [
    {
        id: 'demo-1',
        title: 'Cyber',
        url:
            'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
    },
    {
        id: 'demo-2',
        title: 'Cool',
        url:
            'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    },
    {
        id: 'demo-3',
        title: 'Funny',
        url:
            'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif',
    },
];

export default function GifPicker({
    onSelect,
    onClose,
}) {
    const [
        query,
        setQuery,
    ] = useState('');

    const filtered =
        DEMO_GIFS.filter(
            (gif) =>
                !query.trim() ||
                gif.title
                    .toLowerCase()
                    .includes(
                        query
                            .trim()
                            .toLowerCase()
                    )
        );

    return (
        <div className="gif-picker">
            <div className="gif-picker-header">
                <strong>
                    GIF
                </strong>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Kapat"
                >
                    ×
                </button>
            </div>

            <input
                value={query}
                onChange={(event) =>
                    setQuery(
                        event.target.value
                    )
                }
                placeholder="GIF ara..."
            />

            <div className="gif-grid">
                {filtered.map(
                    (gif) => (
                        <button
                            type="button"
                            key={gif.id}
                            onClick={() =>
                                onSelect(gif)
                            }
                        >
                            <img
                                src={gif.url}
                                alt={gif.title}
                            />
                        </button>
                    )
                )}
            </div>
        </div>
    );
}