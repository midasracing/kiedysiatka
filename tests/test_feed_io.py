"""Publishing must preserve the last good snapshot when a write fails."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts.feed_io import atomic_json


class AtomicFeedTests(unittest.TestCase):
    def test_utf8_payload_and_permissions_survive_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'nested' / 'feed.json'
            atomic_json(path, {'team': 'Łódź'})
            self.assertEqual(json.loads(path.read_text()), {'team': 'Łódź'})
            self.assertIn('Łódź', path.read_text())
            path.chmod(0o640)
            atomic_json(path, {'team': 'Gdańsk'})
            self.assertEqual(path.stat().st_mode & 0o777, 0o640)
            self.assertEqual(list(path.parent.iterdir()), [path])

    def test_failed_serialization_or_replace_preserves_previous_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'feed.json'
            atomic_json(path, {'matches': ['previous']})
            previous = path.read_bytes()
            with self.assertRaises(TypeError):
                atomic_json(path, {'bad': object()})
            self.assertEqual(path.read_bytes(), previous)
            self.assertEqual(list(path.parent.iterdir()), [path])
            with patch('scripts.feed_io.os.replace', side_effect=OSError('disk unavailable')):
                with self.assertRaises(OSError):
                    atomic_json(path, {'matches': ['new']})
            self.assertEqual(path.read_bytes(), previous)
            self.assertEqual(list(path.parent.iterdir()), [path])
