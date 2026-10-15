import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

function normalizeOptions(options) {
  return options.map(option => {
    if (option == null) return { value: option, label: String(option) };
    if (typeof option === 'string' || typeof option === 'number') {
      return { value: option, label: String(option) };
    }
    return { value: option.value, label: option.label ?? String(option.value), disabled: option.disabled };
  });
}

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  id,
  ariaLabel,
}) {
  const normalized = useMemo(() => normalizeOptions(options), [options]);
  const selected = normalized.find(option => option.value === value);
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      const selectedIndex = normalized.findIndex(option => option.value === value && !option.disabled);
      setHighlighted(selectedIndex >= 0 ? selectedIndex : normalized.findIndex(option => !option.disabled));
    }
  }, [open, normalized, value]);

  useEffect(() => {
    if (!open || !rootRef.current) return;

    const updateDirection = () => {
      const rootRect = rootRef.current.getBoundingClientRect();
      const bottomSpace = window.innerHeight - rootRect.bottom;
      const topSpace = rootRect.top;
      const menuHeight = 260;
      const shouldOpenUpward = bottomSpace < menuHeight + 8 || topSpace > bottomSpace;
      setOpenUpward(shouldOpenUpward);
    };

    updateDirection();
    window.addEventListener('resize', updateDirection);
    window.addEventListener('scroll', updateDirection, true);
    return () => {
      window.removeEventListener('resize', updateDirection);
      window.removeEventListener('scroll', updateDirection, true);
    };
  }, [open]);

  useEffect(() => {
    function handleClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open || highlighted < 0 || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-index=\"${highlighted}\"]`);
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  function handleToggle() {
    if (disabled) return;
    if (!open && rootRef.current) {
      const rootRect = rootRef.current.getBoundingClientRect();
      const bottomSpace = window.innerHeight - rootRect.bottom;
      const topSpace = rootRect.top;
      const menuHeight = 260;
      const shouldOpenUpward = bottomSpace < menuHeight + 8 || topSpace > bottomSpace;
      setOpenUpward(shouldOpenUpward);
    }
    setOpen(prev => !prev);
  }

  function handleSelect(option) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (highlighted >= 0) {
        handleSelect(normalized[highlighted]);
      }
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      let next = highlighted;
      do {
        next = (next + direction + normalized.length) % normalized.length;
      } while (normalized[next]?.disabled && next !== highlighted);
      setHighlighted(next);
      return;
    }
  }

  return (
    <div ref={rootRef} className={`dropdown ${openUpward ? 'open-upward' : ''} ${className}`}>
      <button
        id={id}
        type="button"
        className="dropdown-toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        <span className={`dropdown-value${selected ? '' : ' placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon name={open ? 'arrow_up' : 'arrow_down'} size={18} />
      </button>

      {open && (
        <ul className="dropdown-menu" role="listbox" tabIndex={-1} ref={listRef}>
          {normalized.map((option, index) => (
            <li
              key={String(option.value) || index}
              role="option"
              aria-selected={option.value === value}
              className={`dropdown-item${option.value === value ? ' selected' : ''}${option.disabled ? ' disabled' : ''}${highlighted === index ? ' highlighted' : ''}`}
              data-index={index}
              onMouseEnter={() => !option.disabled && setHighlighted(index)}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
