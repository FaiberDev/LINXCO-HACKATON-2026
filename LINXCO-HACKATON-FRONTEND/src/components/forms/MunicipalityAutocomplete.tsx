import React, { useState, useMemo, useRef, useEffect, useId } from 'react';
import divipolaRaw from '../../data/divipola.json';
import {
  MapPinLine,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  CaretDown,
} from '@phosphor-icons/react';

export interface MunicipioItem {
  codMpio: string;
  codDpto: string;
  municipio: string;
  departamento: string;
  label: string;
  searchNorm: string;
  mpioNorm: string;
  dptoNorm: string;
}

function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

const ALL_LOCATIONS: MunicipioItem[] = (() => {
  const dptos: Record<string, string> = divipolaRaw.departamentos || {};
  const mpios: string[][] = divipolaRaw.municipios || [];

  const list: MunicipioItem[] = mpios.map(([codMpio, nomMpio]) => {
    const codDpto = codMpio.slice(0, 2);
    const departamento = dptos[codDpto] || 'Colombia';
    const label = `${nomMpio} (${departamento.toUpperCase()})`;
    return {
      codMpio,
      codDpto,
      municipio: nomMpio,
      departamento,
      label,
      searchNorm: normalizeText(`${nomMpio} ${departamento}`),
      mpioNorm: normalizeText(nomMpio),
      dptoNorm: normalizeText(departamento),
    };
  });

  return list;
})();

const ALL_DEPARTAMENTOS: string[] = Object.values(divipolaRaw.departamentos || {}).sort();

export function searchMunicipios(query: string, limit = 30): {
  matchingDepartamentos: string[];
  matchingMunicipios: MunicipioItem[];
} {
  const norm = normalizeText(query);
  if (!norm) {
    return {
      matchingDepartamentos: ['VALLE DEL CAUCA', 'CAUCA', 'VAUPÉS', 'ANTIOQUIA', 'CUNDINAMARCA', 'NARIÑO'],
      matchingMunicipios: ALL_LOCATIONS.slice(0, limit),
    };
  }

  // Departamentos que coinciden con lo escrito (ej: "VA" -> "VAUPÉS", "VALLE DEL CAUCA")
  const matchingDepartamentos = ALL_DEPARTAMENTOS.filter((d) =>
    normalizeText(d).startsWith(norm) || normalizeText(d).includes(norm)
  ).map((d) => d.toUpperCase());

  // Priorizar municipios que empiezan por query, luego departamentos que empiezan por query, luego coincidencias parciales
  const startsWithMpio: MunicipioItem[] = [];
  const startsWithDpto: MunicipioItem[] = [];
  const includesAny: MunicipioItem[] = [];

  for (const item of ALL_LOCATIONS) {
    if (item.mpioNorm.startsWith(norm)) {
      startsWithMpio.push(item);
    } else if (item.dptoNorm.startsWith(norm)) {
      startsWithDpto.push(item);
    } else if (item.searchNorm.includes(norm)) {
      includesAny.push(item);
    }
  }

  return {
    matchingDepartamentos: matchingDepartamentos.slice(0, 6),
    matchingMunicipios: [...startsWithMpio, ...startsWithDpto, ...includesAny].slice(0, limit),
  };
}

interface MunicipalityAutocompleteProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string, item?: MunicipioItem) => void;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export const MunicipalityAutocomplete: React.FC<MunicipalityAutocompleteProps> = ({
  id,
  label = 'Municipio *',
  value,
  onChange,
  placeholder = 'Escribe municipio o departamento (ej. VA -> Vaupés, Valle del Cauca)...',
  required = false,
  helperText,
  disabled = false,
  className = '',
}) => {
  const generatedId = useId();
  const inputId = id || `municipio-input-${generatedId}`;
  const datalistId = `${inputId}-datalist`;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { matchingDepartamentos, matchingMunicipios } = useMemo(
    () => searchMunicipios(value, 25),
    [value]
  );

  // Cerrar dropdown al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMunicipio = (item: MunicipioItem) => {
    onChange(`${item.municipio}, ${item.departamento}`, item);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleFilterByDepartamento = (dpto: string) => {
    onChange(dpto);
    setIsOpen(true);
    setActiveIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < matchingMunicipios.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : matchingMunicipios.length - 1
      );
    } else if (e.key === 'Enter' && isOpen && activeIndex >= 0 && matchingMunicipios[activeIndex]) {
      e.preventDefault();
      handleSelectMunicipio(matchingMunicipios[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-institucional-600">
          <MapPinLine weight="duotone" className="w-5 h-5" />
        </div>

        <input
          id={inputId}
          type="text"
          list={datalistId}
          required={required}
          disabled={disabled}
          value={value}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[48px] pl-10 pr-20 py-2.5 text-sm font-medium rounded-xl border-2 border-charcoal-300 bg-white text-charcoal-950 placeholder:text-charcoal-400 focus:border-institucional-500 focus:ring-2 focus:ring-aqua-400/30 transition"
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(true);
              }}
              aria-label="Limpiar municipio"
              className="p-1 text-charcoal-400 hover:text-charcoal-800 rounded-md"
            >
              <XCircle weight="fill" className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => !disabled && setIsOpen((o) => !o)}
            aria-label="Mostrar lista de municipios"
            className="p-1 text-charcoal-500 hover:text-charcoal-900 rounded-md"
          >
            <CaretDown weight="bold" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Native <datalist> fallback for assistive technologies & standard HTML forms */}
      <datalist id={datalistId}>
        {matchingMunicipios.slice(0, 20).map((m) => (
          <option key={m.codMpio} value={`${m.municipio}, ${m.departamento}`}>
            {m.label}
          </option>
        ))}
      </datalist>

      {helperText && (
        <p className="mt-1 text-[11px] text-charcoal-600">{helperText}</p>
      )}

      {/* Interactive Filtered Dropdown Panel */}
      {isOpen && !disabled && (
        <div
          role="listbox"
          aria-label="Sugerencias de municipios y departamentos de Colombia"
          className="absolute z-40 mt-1.5 w-full max-h-72 overflow-y-auto rounded-2xl bg-white border-2 border-charcoal-800 shadow-xl divide-y divide-charcoal-100 animate-fadeIn"
        >
          {/* Matching Departments Quick Filter */}
          {matchingDepartamentos.length > 0 && (
            <div className="p-2.5 bg-olive-50/80">
              <span className="block text-[10px] font-black uppercase tracking-wider text-charcoal-600 mb-1.5 px-1">
                Departamentos sugeridos (clic para filtrar municipios):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {matchingDepartamentos.map((dpto) => (
                  <button
                    key={dpto}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleFilterByDepartamento(dpto);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-institucional-500 hover:text-white text-charcoal-900 border border-olive-400 transition flex items-center gap-1"
                  >
                    <MagnifyingGlass weight="bold" className="w-3 h-3 text-institucional-500 group-hover:text-white" />
                    <span>{dpto}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Municipalities */}
          {matchingMunicipios.length === 0 ? (
            <div className="p-4 text-center text-xs text-charcoal-600">
              No encontramos un municipio oficial DANE con <strong>"{value}"</strong>. Intenta escribir las primeras letras del municipio o departamento.
            </div>
          ) : (
            <ul className="py-1 divide-y divide-charcoal-100/60">
              {matchingMunicipios.map((item, idx) => {
                const isSelected = activeIndex === idx;
                return (
                  <li key={item.codMpio}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectMunicipio(item);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition ${
                        isSelected
                          ? 'bg-institucional-50 text-institucional-900 font-bold'
                          : 'hover:bg-olive-50 text-charcoal-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle
                          weight="duotone"
                          className="w-4 h-4 text-olive-600 shrink-0"
                        />
                        <span className="font-bold truncate">{item.municipio}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-charcoal-100 text-charcoal-800 font-mono text-[10px] font-semibold uppercase shrink-0">
                        {item.departamento}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
