"""Windows compatibility for genlayer-test direct mode."""

import atexit
import os
from pathlib import Path
import tempfile


if os.name == "nt":
    _unlink = os.unlink
    _deferred_paths: list[str] = []
    _temp_dir = Path(tempfile.gettempdir()).resolve()

    def _defer_locked_temp_file(path, *args, **kwargs):
        try:
            _unlink(path, *args, **kwargs)
        except PermissionError:
            resolved = Path(path).resolve()
            if resolved.parent != _temp_dir or not resolved.name.startswith("tmp"):
                raise
            _deferred_paths.append(str(resolved))

    os.unlink = _defer_locked_temp_file

from gltest.direct.sdk_loader import setup_sdk_paths
_contract_file = Path(__file__).resolve().parent.parent / "contracts" / "critiqproof.py"
if _contract_file.exists():
    setup_sdk_paths(_contract_file)
    import sys
    sys.modules.pop("genlayer", None)
    @atexit.register
    def _remove_deferred_temp_files() -> None:
        for path in _deferred_paths:
            try:
                _unlink(path)
            except (FileNotFoundError, PermissionError):
                pass

import pytest

def pytest_runtest_setup(item):
    if _contract_file.exists():
        setup_sdk_paths(_contract_file)
    import sys
    gen_mod = sys.modules.get("genlayer")
    if gen_mod is not None:
        file_path = getattr(gen_mod, "__file__", "") or ""
        if "gltest-direct" not in file_path:
            for k in list(sys.modules.keys()):
                if k == "genlayer" or k.startswith("genlayer."):
                    sys.modules.pop(k, None)
    import sys
    if "genlayer.gl.genvm_contracts" in sys.modules:
        sys.modules["genlayer.gl.genvm_contracts"].__known_contract__ = None

@pytest.fixture(autouse=True)
def _reset_genlayer_contract_state():
    if _contract_file.exists():
        setup_sdk_paths(_contract_file)
    import sys
    if "genlayer.gl.genvm_contracts" in sys.modules:
        sys.modules["genlayer.gl.genvm_contracts"].__known_contract__ = None
    yield
    if "genlayer.gl.genvm_contracts" in sys.modules:
        sys.modules["genlayer.gl.genvm_contracts"].__known_contract__ = None


