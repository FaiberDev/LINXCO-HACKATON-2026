import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { apiFetch } from '../services/api';
import { MunicipalityAutocomplete } from '../components/forms/MunicipalityAutocomplete';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Copy,
  WarningCircle,
  SpinnerGap,
  FileDoc,
  DownloadSimple,
  UserCheck,
  Heartbeat,
  GraduationCap,
  Drop,
  Farm,
  Scales,
  User,
  IdentificationCard,
  Buildings,
  CalendarBlank,
  MapPinLine,
  Info,
  Paperclip,
  Minus,
  Plus,
} from '@phosphor-icons/react';

export interface VariableRequerida {
  id: string;
  pregunta: string;
}

export interface SubcategoriaArbol {
  id: string;
  descripcion: string;
  plantilla?: string;
  mecanismo?: string;
  variables_requeridas?: VariableRequerida[];
  accion?: 'handoff_asesor' | string;
}

export interface CategoriaArbol {
  id: string;
  letra: string;
  titulo: string;
  icono?: string;
  subcategorias: SubcategoriaArbol[];
}

export const ARBOL_DECISION_DEFAULT: CategoriaArbol[] = [
  {
    id: 'salud',
    letra: 'A',
    titulo: 'Salud',
    subcategorias: [
      {
        id: 'dp_medicamentos',
        descripcion: 'Me niegan o demoran la entrega de medicamentos (Derecho de Petición)',
        plantilla: 'Plantilla Derecho de Petición Medicamentos Colombia.docx',
        mecanismo: 'Derecho de petición',
        variables_requeridas: [
          { id: 'NOMBRE_COMPLETO_PACIENTE_USUARIO', pregunta: '¿Cuál es tu nombre y apellido?' },
          { id: 'NUMERO_CEDULA', pregunta: '¿Cuál es tu número de cédula o documento de identidad?' },
          { id: 'NOMBRE_EPS', pregunta: '¿A qué EPS o IPS estás afiliado(a) y va dirigido el reclamo?' },
          { id: 'DIAGNOSTICO_MEDICO_O_ENFERMEDAD', pregunta: '¿Cuál es tu diagnóstico médico o enfermedad?' },
          { id: 'NOMBRE_MEDICAMENTO_1', pregunta: '¿Qué medicamento(s) te formularon y están pendientes de entrega?' },
          { id: 'CIUDAD_O_MUNICIPIO_RADICACION', pregunta: '¿En qué municipio y vereda/barrio vives?' },
        ],
      },
      {
        id: 'tutela_medicamentos',
        descripcion: 'No me entregan medicamentos urgentes y mi salud está en riesgo (Acción de Tutela)',
        plantilla: 'Plantilla Accion de Tutela Medicamentos Colombia.docx',
        mecanismo: 'Acción de tutela',
        variables_requeridas: [
          { id: 'NOMBRE_ACCIONANTE', pregunta: '¿Cuál es tu nombre y apellido?' },
          { id: 'NUMERO_CEDULA', pregunta: '¿Cuál es tu número de cédula?' },
          { id: 'NOMBRE_EPS', pregunta: '¿Cuál es el nombre de la EPS accionada?' },
          { id: 'DIAGNOSTICO_MEDICO', pregunta: '¿Cuál es el diagnóstico médico exacto?' },
          { id: 'NOMBRE_MEDICAMENTO', pregunta: '¿Qué medicamento urgente y dosis te negaron?' },
          { id: 'CIUDAD_O_MUNICIPIO', pregunta: '¿En qué municipio y dirección/vereda resides?' },
        ],
      },
      {
        id: 'tutela_cirugia',
        descripcion: 'No me autorizan una cirugía, examen o tratamiento médico vital (Acción de Tutela)',
        plantilla: 'TUTELA CIRUGIA.docx',
        mecanismo: 'Acción de tutela',
        variables_requeridas: [
          { id: 'NOMBRE_ACCIONANTE', pregunta: '¿Cuál es tu nombre y apellido?' },
          { id: 'NUMERO_DOCUMENTO_ACCIONANTE', pregunta: '¿Cuál es tu número de cédula?' },
          { id: 'NOMBRE_EPS', pregunta: '¿A qué EPS va dirigida la tutela?' },
          { id: 'DIAGNOSTICO_MEDICO', pregunta: '¿Cuál es el diagnóstico médico?' },
          { id: 'NOMBRE_CIRUGIA_O_TRATAMIENTO', pregunta: '¿Qué cirugía, examen o tratamiento ordenó el médico y no han autorizado?' },
          { id: 'VEREDA_CORREGIMIENTO_O_BARRIO', pregunta: '¿En qué vereda, barrio y municipio resides?' },
        ],
      },
      {
        id: 'otra_salud',
        descripcion: 'Otra situación de salud...',
        accion: 'handoff_asesor',
      },
    ],
  },
  {
    id: 'educacion',
    letra: 'B',
    titulo: 'Educación',
    subcategorias: [
      {
        id: 'dp_transporte_escolar',
        descripcion: 'No tenemos ruta de transporte escolar para los estudiantes de la vereda (Derecho de Petición)',
        plantilla: 'Plantilla Derecho de Petición Ausencia de Transporte Escolar.docx',
        mecanismo: 'Derecho de petición',
        variables_requeridas: [
          { id: 'NOMBRE_COMPLETO_PETICIONARIO', pregunta: 'Nombre y apellido (padre, madre o acudiente):' },
          { id: 'NUMERO_CEDULA', pregunta: '¿Cuál es tu número de cédula?' },
          { id: 'NOMBRE_ESTUDIANTE', pregunta: '¿Cuál es el nombre y apellido del estudiante y qué grado cursa?' },
          { id: 'NOMBRE_INSTITUCION_EDUCATIVA', pregunta: '¿Cómo se llama el colegio o institución educativa?' },
          { id: 'NOMBRE_VEREDA', pregunta: '¿En qué vereda y municipio viven y a qué distancia está el colegio?' },
        ],
      },
      {
        id: 'tutela_cupo_escolar',
        descripcion: 'A mi hijo(a) menor de edad le niegan el cupo escolar (Acción de Tutela)',
        plantilla: 'TUTELA CUPO COLEGIO.docx',
        mecanismo: 'Acción de tutela',
        variables_requeridas: [
          { id: 'NOMBRE_ACCIONANTE', pregunta: 'Nombre y apellido (padre, madre o representante):' },
          { id: 'NUMERO_DOCUMENTO_ACCIONANTE', pregunta: '¿Cuál es tu número de cédula?' },
          { id: 'NOMBRE_MENOR', pregunta: '¿Cuál es el nombre y apellido del niño, niña o adolescente?' },
          { id: 'EDAD_MENOR', pregunta: '¿Qué edad tiene el niño, niña o adolescente?' },
          { id: 'GRADO_ESCOLAR_SOLICITADO', pregunta: '¿Para qué grado escolar solicita el cupo?' },
          { id: 'ENTIDAD_RECEPTORA_SOLICITUD', pregunta: '¿Ante qué Secretaría de Educación o Colegio solicitaste el cupo?' },
          { id: 'VEREDA_CORREGIMIENTO_O_BARRIO', pregunta: '¿En qué vereda y municipio residen?' },
        ],
      },
      {
        id: 'otra_educacion',
        descripcion: 'Otra situación de educación...',
        accion: 'handoff_asesor',
      },
    ],
  },
  {
    id: 'servicios_publicos',
    letra: 'C',
    titulo: 'Servicios Públicos',
    subcategorias: [
      {
        id: 'tutela_agua_potable',
        descripcion: 'Mi familia o vivienda no cuenta con el mínimo vital de agua potable (Acción de Tutela)',
        plantilla: 'Plantilla Acción de Tutela Mínimo Vital de Agua Potable (1).docx',
        mecanismo: 'Acción de tutela',
        variables_requeridas: [
          { id: 'NOMBRE_COMPLETO_ACCIONANTE', pregunta: '¿Cuál es tu nombre y apellido?' },
          { id: 'NUMERO_CEDULA', pregunta: '¿Cuál es tu número de cédula?' },
          { id: 'NOMBRE_EMPRESA_PRESTADORA_ACUEDUCTO', pregunta: '¿Cuál es la empresa de acueducto o alcaldía responsable del servicio?' },
          { id: 'CAUSA_CORTE_O_FALTA_SERVICIO', pregunta: 'Explica brevemente desde cuándo no tienen agua potable y cuántas personas viven en el hogar:' },
          { id: 'DIRECCION_EXACTA_BARRIO_SECTOR_VEREDA', pregunta: '¿Cuál es la vereda, dirección y municipio de la vivienda afectada?' },
        ],
      },
      {
        id: 'dp_energia_electrica',
        descripcion: 'Falta de servicio o cortes prolongados de energía eléctrica en la vereda/sector (Derecho de Petición)',
        plantilla: 'Plantilla Derecho de Peticion Ausencia de Energia Electrica (Definitiva).docx',
        mecanismo: 'Derecho de petición',
        variables_requeridas: [
          { id: 'NOMBRE_COMPLETO', pregunta: '¿Cuál es tu nombre y apellido?' },
          { id: 'NUMERO_CEDULA', pregunta: '¿Cuál es tu número de cédula?' },
          { id: 'ENTIDAD_DESTINATARIA', pregunta: '¿Cuál es la empresa de energía eléctrica (ej. Celsia, EPM, Enel, Afinia)?' },
          { id: 'NUMERO_NIC_CONTRATO', pregunta: '¿Cuál es el número de NIC, contrato o cuenta del recibo (o escribe "Comunitario")?' },
          { id: 'FECHA_SUSPENSION_SERVICIO', pregunta: '¿Desde qué fecha están sin energía o con fallas y en qué vereda/municipio?' },
        ],
      },
      {
        id: 'otra_servicios',
        descripcion: 'Otra situación de servicios públicos...',
        accion: 'handoff_asesor',
      },
    ],
  },
  {
    id: 'tierras_vivienda',
    letra: 'D',
    titulo: 'Tierras y Vivienda',
    subcategorias: [
      {
        id: 'dp_titulacion_tierras',
        descripcion: 'Mi trámite de titulación o adjudicación de predio rural ante la ANT no avanza (Derecho de Petición)',
        plantilla: 'Plantilla Derecho de Petición Titulación de Tierras ANT.docx',
        mecanismo: 'Derecho de petición',
        variables_requeridas: [
          { id: 'NOMBRE_COMPLETO_PETICIONARIO', pregunta: '¿Cuál es tu nombre y apellido?' },
          { id: 'NUMERO_CEDULA', pregunta: '¿Cuál es tu número de cédula?' },
          { id: 'NOMBRE_PREDIO_O_FINCA', pregunta: '¿Cuál es el nombre del predio o finca?' },
          { id: 'NUMERO_EXPEDIENTE_O_FISO', pregunta: '¿Cuál es el número de expediente o formulario FISO (si lo conoces, o escribe "En consulta")?' },
          { id: 'NOMBRE_VEREDA', pregunta: '¿En qué vereda y municipio está ubicado el predio?' },
        ],
      },
      {
        id: 'dp_carretera_veredal',
        descripcion: 'Deterioro grave de carretera veredal que incomunica mi vivienda o vereda (Derecho de Petición)',
        plantilla: 'CIUDAD.docx',
        mecanismo: 'Derecho de petición',
        variables_requeridas: [
          { id: 'NOMBRE_COMPLETO', pregunta: '¿Cuál es tu nombre y apellido?' },
          { id: 'NUMERO_DOCUMENTO', pregunta: '¿Cuál es tu número de cédula?' },
          { id: 'ENTIDAD_DESTINATARIA', pregunta: '¿A qué Alcaldía o Secretaría de Infraestructura diriges la petición?' },
          { id: 'NOMBRE_VEREDA_CARRETERA', pregunta: '¿En qué vereda y municipio se encuentra el tramo de carretera dañado?' },
          { id: 'DESCRIPCION_DANOS_CARRETERA', pregunta: 'Describe brevemente los daños de la vía y cómo afecta a las familias:' },
        ],
      },
      {
        id: 'otra_tierras',
        descripcion: 'Otra situación de tierras o vivienda...',
        accion: 'handoff_asesor',
      },
    ],
  },
  {
    id: 'laboral_consumo',
    letra: 'E',
    titulo: 'Laboral o Consumo',
    subcategorias: [
      {
        id: 'tutela_no_respuesta_peticion',
        descripcion: 'Presenté un Derecho de Petición o reclamo (laboral, consumo o entidad) y venció el plazo sin respuesta (Acción de Tutela)',
        plantilla: 'Plantilla Acción de Tutela por No Respuesta del Derecho de Petición.docx',
        mecanismo: 'Acción de tutela',
        variables_requeridas: [
          { id: 'NOMBRE_COMPLETO_ACCIONANTE', pregunta: '¿Cuál es tu nombre y apellido?' },
          { id: 'NUMERO_CEDULA', pregunta: '¿Cuál es tu número de cédula?' },
          { id: 'NOMBRE_COMPLETO_ENTIDAD_O_AUTORIDAD_ACCIONADA', pregunta: '¿Ante qué empresa, empleador o entidad presentaste la petición sin respuesta?' },
          { id: 'FECHA_RADICACION_DERECHO_PETICION', pregunta: '¿En qué fecha radicaste el Derecho de Petición o reclamo inicial?' },
          { id: 'RESUMEN_SOLICITUD_DERECHO_PETICION', pregunta: '¿Qué solicitabas en esa petición y en qué municipio te encuentras?' },
        ],
      },
      {
        id: 'otra_laboral',
        descripcion: 'Otra situación laboral o de consumo...',
        accion: 'handoff_asesor',
      },
    ],
  },
];

// Clasificadores de tipo de variable de plantilla para renderizar el input más ergonómico y validado
const PERSON_NAME_VAR_IDS = new Set([
  'NOMBRE_COMPLETO_PACIENTE_USUARIO',
  'NOMBRE_ACCIONANTE',
  'NOMBRE_COMPLETO_PETICIONARIO',
  'NOMBRE_COMPLETO_ACCIONANTE',
  'NOMBRE_COMPLETO',
  'NOMBRE_MENOR',
  'NOMBRE_ESTUDIANTE',
]);

const DOCUMENT_VAR_IDS = new Set([
  'NUMERO_CEDULA',
  'NUMERO_DOCUMENTO',
  'NUMERO_DOCUMENTO_ACCIONANTE',
]);

const LOCATION_VAR_IDS = new Set([
  'CIUDAD_O_MUNICIPIO_RADICACION',
  'CIUDAD_O_MUNICIPIO',
  'VEREDA_CORREGIMIENTO_O_BARRIO',
  'NOMBRE_VEREDA',
  'DIRECCION_EXACTA_BARRIO_SECTOR_VEREDA',
  'NOMBRE_VEREDA_CARRETERA',
]);

const AGE_VAR_IDS = new Set(['EDAD_MENOR', 'EDAD']);

const GRADE_VAR_IDS = new Set([
  'GRADO_ESCOLAR_SOLICITADO',
  'GRADO_ESCOLAR',
  'GRADO',
]);

const GRADOS_PRIMARIA = [
  'Primero (1°)',
  'Segundo (2°)',
  'Tercero (3°)',
  'Cuarto (4°)',
  'Quinto (5°)',
];

const GRADOS_SECUNDARIA = [
  'Sexto (6°)',
  'Séptimo (7°)',
  'Octavo (8°)',
  'Noveno (9°)',
  'Décimo (10°)',
  'Once (11°)',
];

const EDADES_LINEAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function isEvidenceVariable(varId: string, pregunta: string = ''): boolean {
  if (
    varId.includes('PRUEBA') ||
    varId.includes('ANEXO') ||
    varId.includes('SOPORTE') ||
    varId.includes('FORMULA') ||
    varId.includes('FACTURA')
  ) {
    return true;
  }
  return /(?:prueba|anexo|soporte|f[oó]rmula|recibo|factura|historia cl[ií]nica|certificado)/i.test(pregunta);
}

const ENTITY_SUGGESTIONS: Record<string, string[]> = {
  NOMBRE_EPS: [
    'Nueva EPS',
    'Asmet Salud EPS',
    'AIC EPSI',
    'Emssanar EPS',
    'Sanitas EPS',
    'Sura EPS',
    'Coosalud EPS',
    'Salud Total EPS',
  ],
  ENTIDAD_DESTINATARIA: [
    'Celsia Colombia E.S.P.',
    'EPM E.S.P.',
    'CEO - Compañía Energética de Occidente',
    'Enel Colombia',
    'Afinia E.S.P.',
    'Alcaldía Municipal — Secretaría de Infraestructura',
  ],
  NOMBRE_EMPRESA_PRESTADORA_ACUEDUCTO: [
    'Acueducto Comunitario / Junta Administradora',
    'Alcaldía Municipal — Oficina de Servicios Públicos',
    'Empresas Municipales de Acueducto y Alcantarillado',
  ],
  ENTIDAD_RECEPTORA_SOLICITUD: [
    'Secretaría de Educación Departamental',
    'Secretaría de Educación Municipal',
    'Rectoría de la Institución Educativa Rural',
  ],
};

function renderCategoriaIcon(catId: string) {
  switch (catId) {
    case 'salud':
      return <Heartbeat weight="duotone" className="w-6 h-6 text-aqua-400" />;
    case 'educacion':
      return <GraduationCap weight="duotone" className="w-6 h-6 text-olive-300" />;
    case 'servicios_publicos':
      return <Drop weight="duotone" className="w-6 h-6 text-aqua-400" />;
    case 'tierras_vivienda':
      return <Farm weight="duotone" className="w-6 h-6 text-olive-300" />;
    default:
      return <Scales weight="duotone" className="w-6 h-6 text-aqua-400" />;
  }
}

type EstadoFlujoWizard =
  | 'ESPERANDO_CATEGORIA'
  | 'ESPERANDO_SUBCATEGORIA'
  | 'RECOLECTANDO_VARIABLES'
  | 'REQUIERE_ASESOR'
  | 'RESUMEN_FINAL';

export const WizardView: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeCode,
    activeCase,
    wizardDraft,
    updateWizardDraft,
    saveCase,
    modifyCase,
    clearWizardDraft,
  } = useCase();

  const [arbol, setArbol] = useState<CategoriaArbol[]>(ARBOL_DECISION_DEFAULT);
  const [estadoFlujo, setEstadoFlujo] = useState<EstadoFlujoWizard>('ESPERANDO_CATEGORIA');
  const [categoriaActual, setCategoriaActual] = useState<CategoriaArbol | null>(null);
  const [subcategoriaActual, setSubcategoriaActual] = useState<SubcategoriaArbol | null>(null);
  const [indiceVariable, setIndiceVariable] = useState<number>(0);

  const [respuestas, setRespuestas] = useState<Record<string, string>>(() => {
    const prev = (wizardDraft.respuestas_recolectadas as Record<string, string>) || {};
    return prev;
  });

  // Estado auxiliar para campos compuestos (Nombre + Apellido / Municipio + Vereda)
  const [splitFields, setSplitFields] = useState<Record<string, { part1: string; part2: string; extra?: string }>>({});

  // Estado para derivación a Asesor Humano ("Otra")
  const [nombresOtra, setNombresOtra] = useState<string>(wizardDraft.ciudadano?.nombres || '');
  const [apellidosOtra, setApellidosOtra] = useState<string>(wizardDraft.ciudadano?.apellidos || '');
  const [municipioOtra, setMunicipioOtra] = useState<string>(wizardDraft.ciudadano?.municipio || '');
  const [explicacionOtra, setExplicacionOtra] = useState<string>('');
  const [telefonoContactoOtra, setTelefonoContactoOtra] = useState<string>(
    wizardDraft.ciudadano?.telefono || ''
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [submittedDocUrl, setSubmittedDocUrl] = useState<string | null>(null);
  const [submittedPdfUrl, setSubmittedPdfUrl] = useState<string | null>(null);
  const [esHandoffAsesor, setEsHandoffAsesor] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sincronizar árbol desde el backend si está disponible
  useEffect(() => {
    let mounted = true;
    apiFetch<{ categorias?: CategoriaArbol[] }>('/arbol-decision')
      .then((res) => {
        if (mounted && res?.categorias && res.categorias.length > 0) {
          setArbol(res.categorias);
        }
      })
      .catch(() => {
        // Usa ARBOL_DECISION_DEFAULT en modo offline
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Nivel 1: Selección de Categoría Principal (A, B, C, D, E)
  const handleSelectCategoria = (cat: CategoriaArbol) => {
    setErrorMsg(null);
    setCategoriaActual(cat);
    setSubcategoriaActual(null);
    setEstadoFlujo('ESPERANDO_SUBCATEGORIA');
    updateWizardDraft({
      categoria: cat.titulo,
      categoria_id: cat.id,
    });
  };

  // Nivel 2: Selección de Subcategoría (Plantilla específica o "Otra")
  const handleSelectSubcategoria = (sub: SubcategoriaArbol) => {
    setErrorMsg(null);
    setSubcategoriaActual(sub);

    const esOtra =
      sub.accion === 'handoff_asesor' ||
      sub.id.toLowerCase().startsWith('otra') ||
      sub.descripcion.toLowerCase().startsWith('otra');

    if (esOtra) {
      setEstadoFlujo('REQUIERE_ASESOR');
      updateWizardDraft({
        subcategoria: sub.id,
        problema: sub.descripcion,
        modalidad: 'handoff_asesor',
      });
      return;
    }

    setIndiceVariable(0);
    setEstadoFlujo('RECOLECTANDO_VARIABLES');
    updateWizardDraft({
      mecanismo: sub.mecanismo || 'Derecho de petición',
      subcategoria: sub.id,
      problema: sub.descripcion,
      plantilla: sub.plantilla,
    });
  };

  const variablesRequeridas = subcategoriaActual?.variables_requeridas || [];
  const variableActual = variablesRequeridas[indiceVariable];

  const handleChangeVariable = (varId: string, valor: string) => {
    const nuevas = { ...respuestas, [varId]: valor };
    setRespuestas(nuevas);
    updateWizardDraft({
      respuestas_recolectadas: nuevas,
    });
  };

  const handleChangeSplitName = (varId: string, nombres: string, apellidos: string, extra?: string) => {
    setSplitFields((prev) => ({
      ...prev,
      [varId]: { part1: nombres, part2: apellidos, extra },
    }));
    const fullName = [nombres.trim(), apellidos.trim()].filter(Boolean).join(' ');
    const combined = extra && extra.trim() ? `${fullName} (${extra.trim()})` : fullName;
    handleChangeVariable(varId, combined);

    // Si es la variable principal del ciudadano, guardar también en ciudadano.nombres y ciudadano.apellidos
    if (varId !== 'NOMBRE_MENOR' && varId !== 'NOMBRE_ESTUDIANTE') {
      updateWizardDraft({
        ciudadano: {
          ...wizardDraft.ciudadano,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          nombre_completo: fullName,
        },
      });
    }
  };

  const handleChangeSplitLocation = (varId: string, municipioVal: string, veredaVal: string) => {
    setSplitFields((prev) => ({
      ...prev,
      [varId]: { part1: municipioVal, part2: veredaVal },
    }));
    const combined = [veredaVal.trim(), municipioVal.trim()].filter(Boolean).join(', ');
    handleChangeVariable(varId, combined);
    updateWizardDraft({
      ciudadano: {
        ...wizardDraft.ciudadano,
        municipio: municipioVal.trim(),
        vereda: veredaVal.trim(),
      },
    });
  };

  const handleSiguienteVariable = () => {
    setErrorMsg(null);
    if (!variableActual) {
      setEstadoFlujo('RESUMEN_FINAL');
      return;
    }

    const varId = variableActual.id;
    const valorActual = (respuestas[varId] || '').trim();

    if (PERSON_NAME_VAR_IDS.has(varId)) {
      const split = splitFields[varId];
      if (!split || !split.part1.trim() || !split.part2.trim()) {
        if (!valorActual || valorActual.split(/\s+/).length < 2) {
          setErrorMsg('Por favor ingresa tanto el Nombre(s) como el Apellido(s) para continuar.');
          return;
        }
      }
    } else if (LOCATION_VAR_IDS.has(varId)) {
      const split = splitFields[varId];
      if (split && !split.part1.trim()) {
        setErrorMsg('Por favor selecciona o escribe el municipio de tu vereda.');
        return;
      }
      if (!valorActual || valorActual.length < 2) {
        setErrorMsg('Por favor indica el municipio y vereda donde resides.');
        return;
      }
    } else if (AGE_VAR_IDS.has(varId)) {
      const num = parseInt(valorActual, 10);
      if (!valorActual || isNaN(num) || num <= 0 || num > 25) {
        setErrorMsg('Por favor ingresa o selecciona una edad válida en años (entre 1 y 18 años).');
        return;
      }
    } else if (!valorActual || valorActual.length < 2) {
      setErrorMsg('Por favor responde esta pregunta antes de continuar.');
      return;
    }

    if (indiceVariable + 1 < variablesRequeridas.length) {
      setIndiceVariable(indiceVariable + 1);
    } else {
      setEstadoFlujo('RESUMEN_FINAL');
    }
  };

  const handleAnterior = () => {
    setErrorMsg(null);
    if (estadoFlujo === 'RESUMEN_FINAL') {
      setIndiceVariable(Math.max(0, variablesRequeridas.length - 1));
      setEstadoFlujo('RECOLECTANDO_VARIABLES');
      return;
    }
    if (estadoFlujo === 'RECOLECTANDO_VARIABLES') {
      if (indiceVariable > 0) {
        setIndiceVariable(indiceVariable - 1);
      } else {
        setEstadoFlujo('ESPERANDO_SUBCATEGORIA');
      }
      return;
    }
    if (estadoFlujo === 'REQUIERE_ASESOR') {
      setEstadoFlujo('ESPERANDO_SUBCATEGORIA');
      return;
    }
    if (estadoFlujo === 'ESPERANDO_SUBCATEGORIA') {
      setEstadoFlujo('ESPERANDO_CATEGORIA');
      return;
    }
    navigate('/portal');
  };

  // Envío cuando elige "Otra" (Estado REQUIERE_ASESOR)
  const handleSubmitOtraAsesor = async () => {
    setErrorMsg(null);
    if (!explicacionOtra.trim() || explicacionOtra.trim().length < 10) {
      setErrorMsg('Por favor explica brevemente tu caso en el cuadro de texto (mínimo 10 caracteres).');
      return;
    }

    const nombreCombinado = [nombresOtra.trim(), apellidosOtra.trim()].filter(Boolean).join(' ');

    setIsSubmitting(true);
    try {
      const tipoProblema = `Requiere Asesor — ${categoriaActual?.titulo || 'General'}`;
      const payload = {
        tipo_problema: tipoProblema,
        estado: 'BORRADOR' as const,
        formulario_web: {
          modalidad: 'handoff_asesor',
          accion: 'handoff_asesor',
          estado_sesion: 'REQUIERE_ASESOR',
          categoria: categoriaActual?.titulo || 'General',
          problema: 'Otra situación — Derivado a Asesor Jurídico',
          hechos: explicacionOtra.trim(),
          datos_usuario_descripcion: explicacionOtra.trim(),
          ciudadano: {
            nombres: nombresOtra.trim() || undefined,
            apellidos: apellidosOtra.trim() || undefined,
            nombre_completo: nombreCombinado || 'Ciudadano en espera de asesor',
            municipio: municipioOtra.trim() || undefined,
            telefono: telefonoContactoOtra.trim() || 'Por confirmar',
          },
        },
      };

      const result =
        activeCode || activeCase?.codigo_sms
          ? await modifyCase(activeCode || activeCase?.codigo_sms || '', payload)
          : await saveCase(payload);

      setEsHandoffAsesor(true);
      setSubmittedCode(result.codigo_sms);
      clearWizardDraft();
    } catch (err) {
      setErrorMsg((err as Error)?.message || 'Error al registrar tu solicitud para el asesor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Envío final cuando completa todas las variables de una de las 10 plantillas
  const handleSubmitPlantilla = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    const nombreCiudadano =
      respuestas.NOMBRE_COMPLETO ||
      respuestas.NOMBRE_ACCIONANTE ||
      respuestas.NOMBRE_COMPLETO_ACCIONANTE ||
      respuestas.NOMBRE_COMPLETO_PACIENTE_USUARIO ||
      respuestas.NOMBRE_COMPLETO_PETICIONARIO ||
      wizardDraft.ciudadano?.nombre_completo ||
      'Ciudadano solicitante';

    const docCiudadano =
      respuestas.NUMERO_CEDULA ||
      respuestas.NUMERO_DOCUMENTO ||
      respuestas.NUMERO_DOCUMENTO_ACCIONANTE ||
      wizardDraft.ciudadano?.numero_documento ||
      '';

    const municipioCiudadano =
      wizardDraft.ciudadano?.municipio ||
      respuestas.CIUDAD_O_MUNICIPIO ||
      respuestas.CIUDAD_O_MUNICIPIO_RADICACION ||
      respuestas.VEREDA_CORREGIMIENTO_O_BARRIO ||
      respuestas.NOMBRE_VEREDA ||
      respuestas.NOMBRE_VEREDA_CARRETERA ||
      respuestas.DIRECCION_EXACTA_BARRIO_SECTOR_VEREDA ||
      '';

    const veredaCiudadano =
      wizardDraft.ciudadano?.vereda ||
      respuestas.VEREDA_CORREGIMIENTO_O_BARRIO ||
      respuestas.NOMBRE_VEREDA ||
      municipioCiudadano;

    const tipoTramite = `${subcategoriaActual?.mecanismo || 'Trámite'} (${
      categoriaActual?.titulo || 'General'
    }: ${subcategoriaActual?.descripcion || ''})`;

    const datosCiudadano = {
      modalidad: 'pagina_web',
      mecanismo: subcategoriaActual?.mecanismo || 'Derecho de petición',
      categoria: categoriaActual?.titulo,
      subcategoria: subcategoriaActual?.id,
      problema: subcategoriaActual?.descripcion,
      plantilla: subcategoriaActual?.plantilla,
      ciudadano: {
        nombres: wizardDraft.ciudadano?.nombres,
        apellidos: wizardDraft.ciudadano?.apellidos,
        nombre_completo: nombreCiudadano,
        numero_documento: docCiudadano,
        municipio: municipioCiudadano,
        vereda: veredaCiudadano,
      },
      respuestas_recolectadas: respuestas,
      ...respuestas,
    };

    try {
      // Llamar al motor de plantillas POST /api/generar-documento
      const genRes = await apiFetch<{
        success: boolean;
        codigo: string;
        ruta_documento?: string;
        ruta_documento_docx?: string;
        ruta_documento_pdf?: string;
      }>('/generar-documento', {
        method: 'POST',
        body: JSON.stringify({
          codigo: activeCode || activeCase?.codigo_sms || undefined,
          tipo_tramite: tipoTramite,
          plantilla: subcategoriaActual?.plantilla,
          datos_ciudadano: datosCiudadano,
        }),
      });

      setEsHandoffAsesor(false);
      setSubmittedCode(genRes.codigo);
      setSubmittedDocUrl(genRes.ruta_documento || genRes.ruta_documento_docx || null);
      setSubmittedPdfUrl(
        genRes.ruta_documento_pdf ||
          (genRes.ruta_documento
            ? genRes.ruta_documento.replace(/\.docx$/i, '.pdf')
            : `/api/casos/${encodeURIComponent(genRes.codigo)}/pdf`)
      );
      clearWizardDraft();
    } catch {
      // Fallback local si el backend está offline
      try {
        const fallbackRes = await saveCase({
          tipo_problema: tipoTramite,
          estado: 'BORRADOR',
          formulario_web: datosCiudadano,
        });
        setEsHandoffAsesor(false);
        setSubmittedCode(fallbackRes.codigo_sms);
        clearWizardDraft();
      } catch (err2) {
        setErrorMsg((err2 as Error)?.message || 'Error al generar el documento.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (submittedCode) {
      navigator.clipboard?.writeText(submittedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Renderizador inteligente del input de la variable actual
  const renderSmartVariableInput = (variable: VariableRequerida) => {
    const varId = variable.id;
    const currentVal = respuestas[varId] || '';

    // 1. Si es una variable de Nombre Completo -> Separar en Nombre(s) y Apellido(s) en Grid de 2 columnas
    if (PERSON_NAME_VAR_IDS.has(varId)) {
      const currentSplit = splitFields[varId] || (() => {
        if (!currentVal) return { part1: '', part2: '', extra: '' };
        const parts = currentVal.replace(/\s*\(.*\)$/, '').split(' ');
        const half = Math.ceil(parts.length / 2);
        return {
          part1: parts.slice(0, half).join(' '),
          part2: parts.slice(half).join(' '),
          extra: '',
        };
      })();

      const isStudentWithGrade = varId === 'NOMBRE_ESTUDIANTE';

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`var-${varId}-nombres`}
                className="block text-xs font-bold uppercase tracking-wider text-charcoal-900 mb-1.5"
              >
                Nombre(s) *
              </label>
              <div className="relative">
                <User
                  weight="duotone"
                  className="w-5 h-5 text-institucional-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  id={`var-${varId}-nombres`}
                  type="text"
                  value={currentSplit.part1}
                  onChange={(e) =>
                    handleChangeSplitName(varId, e.target.value, currentSplit.part2, currentSplit.extra)
                  }
                  placeholder="Ej: José Albeiro"
                  className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={`var-${varId}-apellidos`}
                className="block text-xs font-bold uppercase tracking-wider text-charcoal-900 mb-1.5"
              >
                Apellido(s) *
              </label>
              <div className="relative">
                <User
                  weight="duotone"
                  className="w-5 h-5 text-olive-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  id={`var-${varId}-apellidos`}
                  type="text"
                  value={currentSplit.part2}
                  onChange={(e) =>
                    handleChangeSplitName(varId, currentSplit.part1, e.target.value, currentSplit.extra)
                  }
                  placeholder="Ej: Cuetia Muñoz"
                  className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950"
                />
              </div>
            </div>
          </div>

          {isStudentWithGrade && (
            <div>
              <label
                htmlFor={`var-${varId}-grado`}
                className="block text-xs font-bold uppercase tracking-wider text-charcoal-900 mb-1.5"
              >
                Grado escolar que cursa
              </label>
              <input
                id={`var-${varId}-grado`}
                type="text"
                value={currentSplit.extra || ''}
                onChange={(e) =>
                  handleChangeSplitName(varId, currentSplit.part1, currentSplit.part2, e.target.value)
                }
                placeholder="Ej: Grado 5° de primaria / Grado 9° bachillerato"
                className="w-full min-h-[48px] px-3.5 py-2.5 text-sm font-semibold rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950"
              />
            </div>
          )}

          {currentVal && (
            <div className="p-2.5 rounded-xl bg-olive-50 border border-olive-300 text-xs text-charcoal-800 flex items-center justify-between">
              <span className="font-semibold">Nombre en el documento legal:</span>
              <span className="font-black text-institucional-800">{currentVal}</span>
            </div>
          )}
        </div>
      );
    }

    // 2. Si es una variable de Municipio / Vereda -> Autocompletado de Municipio DANE + Input de Vereda/Dirección
    if (LOCATION_VAR_IDS.has(varId)) {
      const currentSplit = splitFields[varId] || {
        part1: wizardDraft.ciudadano?.municipio || currentVal,
        part2: wizardDraft.ciudadano?.vereda || '',
      };

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MunicipalityAutocomplete
            id={`var-${varId}`}
            label="Municipio (DANE) *"
            value={currentSplit.part1}
            onChange={(munVal) => handleChangeSplitLocation(varId, munVal, currentSplit.part2)}
            placeholder="Escribe p. ej. VA -> Vaupés, Valle del Cauca..."
            helperText="Filtra al instante entre los 1.122 municipios de Colombia."
          />

          <div>
            <label
              htmlFor={`var-${varId}-vereda`}
              className="block text-xs font-bold uppercase tracking-wider text-charcoal-900 mb-1.5"
            >
              Vereda, Corregimiento o Dirección *
            </label>
            <div className="relative">
              <MapPinLine
                weight="duotone"
                className="w-5 h-5 text-olive-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id={`var-${varId}-vereda`}
                type="text"
                value={currentSplit.part2}
                onChange={(e) => handleChangeSplitLocation(varId, currentSplit.part1, e.target.value)}
                placeholder="Ej: Vereda El Salado, Finca La Esperanza"
                className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950"
              />
            </div>
            <p className="mt-1 text-[11px] text-charcoal-600">
              Indica el nombre de tu vereda, resguardo o sector rural.
            </p>
          </div>
        </div>
      );
    }

    // 3. Si es Número de Cédula / Documento -> Input numérico limpio con formato claro
    if (DOCUMENT_VAR_IDS.has(varId)) {
      return (
        <div>
          <div className="relative">
            <IdentificationCard
              weight="duotone"
              className="w-5 h-5 text-institucional-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              id={`var-${varId}`}
              type="text"
              inputMode="numeric"
              value={currentVal}
              onChange={(e) => handleChangeVariable(varId, e.target.value.replace(/[^0-9A-Za-z.-]/g, ''))}
              placeholder="Ej: 1061234567 (sin puntos ni espacios)"
              className="w-full min-h-[50px] pl-10 pr-4 py-2.5 text-base font-mono font-bold rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-charcoal-600">
            Ingresa únicamente los números de tu Cédula de Ciudadanía o documento de identidad.
          </p>
        </div>
      );
    }

    // 4. Si es Fecha de Radicación -> Selector de fecha o texto asistido
    if (varId === 'FECHA_RADICACION_DERECHO_PETICION') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <label
              htmlFor={`var-${varId}-date`}
              className="block text-xs font-bold uppercase tracking-wider text-charcoal-800 mb-1.5"
            >
              Seleccionar fecha en calendario
            </label>
            <div className="relative">
              <CalendarBlank
                weight="duotone"
                className="w-5 h-5 text-institucional-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id={`var-${varId}-date`}
                type="date"
                onChange={(e) => {
                  if (e.target.value) {
                    handleChangeVariable(varId, e.target.value);
                  }
                }}
                className="w-full min-h-[48px] pl-10 pr-3.5 py-2 text-sm font-semibold rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor={`var-${varId}`}
              className="block text-xs font-bold uppercase tracking-wider text-charcoal-800 mb-1.5"
            >
              Fecha en texto o detalle *
            </label>
            <input
              id={`var-${varId}`}
              type="text"
              value={currentVal}
              onChange={(e) => handleChangeVariable(varId, e.target.value)}
              placeholder="Ej: 15 de agosto de 2026"
              className="w-full min-h-[48px] px-3.5 py-2 text-sm font-semibold rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950"
            />
          </div>
        </div>
      );
    }

    // 5. Si es Edad (EDAD_MENOR) -> Selector numérico lineal con botones +/- y chips directos
    if (AGE_VAR_IDS.has(varId)) {
      const numericVal = parseInt(currentVal.replace(/[^0-9]/g, ''), 10) || 0;
      const handleAgeChange = (val: number) => {
        const clamped = Math.max(1, Math.min(18, val));
        handleChangeVariable(varId, String(clamped));
      };

      return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-olive-50/70 p-4 rounded-2xl border-2 border-charcoal-300">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-800">
              Edad en años *:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAgeChange((numericVal || 10) - 1)}
                className="w-12 h-12 rounded-xl bg-white hover:bg-olive-200 border-2 border-charcoal-800 flex items-center justify-center font-black text-lg text-charcoal-950 active:scale-95 transition"
                aria-label="Disminuir un año"
              >
                <Minus weight="bold" className="w-5 h-5" />
              </button>
              <input
                id={`var-${varId}`}
                type="number"
                min={1}
                max={18}
                value={numericVal || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    handleAgeChange(val);
                  } else {
                    handleChangeVariable(varId, '');
                  }
                }}
                placeholder="10"
                className="w-24 h-12 text-center text-xl font-mono font-black rounded-xl border-2 border-charcoal-800 bg-white text-charcoal-950 focus:border-institucional-500"
              />
              <button
                type="button"
                onClick={() => handleAgeChange((numericVal || 9) + 1)}
                className="w-12 h-12 rounded-xl bg-white hover:bg-olive-200 border-2 border-charcoal-800 flex items-center justify-center font-black text-lg text-charcoal-950 active:scale-95 transition"
                aria-label="Aumentar un año"
              >
                <Plus weight="bold" className="w-5 h-5" />
              </button>
              <span className="text-sm font-black text-charcoal-800 ml-1">años</span>
            </div>
            {numericVal > 0 && (
              <span className="sm:ml-auto px-3.5 py-1.5 rounded-xl bg-institucional-500 text-white font-bold text-xs border border-charcoal-900">
                {numericVal} {numericVal === 1 ? 'año cumplido' : 'años cumplidos'}
              </span>
            )}
          </div>

          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-700 mb-2">
              Selección rápida lineal (1 a 18 años):
            </span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {EDADES_LINEAL.map((edad) => {
                const isSelected = numericVal === edad;
                return (
                  <button
                    key={edad}
                    type="button"
                    onClick={() => handleAgeChange(edad)}
                    className={`min-w-[42px] h-10 px-2.5 rounded-xl text-xs font-black border-2 transition ${
                      isSelected
                        ? 'bg-institucional-500 text-white border-charcoal-950 shadow-sm scale-105'
                        : 'bg-white hover:bg-olive-100 text-charcoal-900 border-charcoal-300'
                    }`}
                  >
                    {edad}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // 6. Si es Grado Escolar (GRADO_ESCOLAR_SOLICITADO) -> Selector categorizado desde Primero hasta Once
    if (GRADE_VAR_IDS.has(varId)) {
      return (
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-800 mb-1.5">
              Básica Primaria (1° a 5°):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {GRADOS_PRIMARIA.map((grado) => {
                const isSelected = currentVal === grado;
                return (
                  <button
                    key={grado}
                    type="button"
                    onClick={() => handleChangeVariable(varId, grado)}
                    className={`min-h-[46px] px-3 py-2 rounded-xl text-xs font-black border-2 transition text-center ${
                      isSelected
                        ? 'bg-institucional-500 text-white border-charcoal-950 shadow-md scale-[1.02]'
                        : 'bg-white hover:bg-olive-100 text-charcoal-900 border-charcoal-300'
                    }`}
                  >
                    {grado}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-charcoal-800 mb-1.5">
              Secundaria y Media (6° a 11°):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {GRADOS_SECUNDARIA.map((grado) => {
                const isSelected = currentVal === grado;
                return (
                  <button
                    key={grado}
                    type="button"
                    onClick={() => handleChangeVariable(varId, grado)}
                    className={`min-h-[46px] px-3 py-2 rounded-xl text-xs font-black border-2 transition text-center ${
                      isSelected
                        ? 'bg-institucional-500 text-white border-charcoal-950 shadow-md scale-[1.02]'
                        : 'bg-white hover:bg-olive-100 text-charcoal-900 border-charcoal-300'
                    }`}
                  >
                    {grado}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <button
              type="button"
              onClick={() => handleChangeVariable(varId, 'Transición / Preescolar')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition ${
                currentVal === 'Transición / Preescolar'
                  ? 'bg-institucional-500 text-white border-charcoal-950'
                  : 'bg-olive-50 hover:bg-olive-200 text-charcoal-900 border-olive-400'
              }`}
            >
              Transición / Preescolar
            </button>
            <div className="flex-1 w-full relative">
              <input
                id={`var-${varId}`}
                type="text"
                value={currentVal}
                onChange={(e) => handleChangeVariable(varId, e.target.value)}
                placeholder="O escribe otro grado / detalle específico..."
                className="w-full min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950"
              />
            </div>
          </div>

          {currentVal && (
            <div className="p-2.5 rounded-xl bg-olive-50 border border-olive-300 text-xs text-charcoal-800 flex items-center justify-between">
              <span className="font-semibold">Grado escolar seleccionado:</span>
              <span className="font-black text-institucional-800">{currentVal}</span>
            </div>
          )}
        </div>
      );
    }

    // 7. Si tiene sugerencias de Entidad (EPS, Empresas de Servicios Públicos, Secretarías)
    const entitySuggestions = ENTITY_SUGGESTIONS[varId];
    if (entitySuggestions) {
      return (
        <div className="space-y-3">
          <div className="relative">
            <Buildings
              weight="duotone"
              className="w-5 h-5 text-institucional-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              id={`var-${varId}`}
              type="text"
              value={currentVal}
              onChange={(e) => handleChangeVariable(varId, e.target.value)}
              placeholder="Escribe el nombre de la entidad o selecciona una sugerencia abajo..."
              className="w-full min-h-[50px] pl-10 pr-4 py-2.5 text-sm font-semibold rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950"
            />
          </div>
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-1.5">
              Entidades frecuentes (clic para autocompletar):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {entitySuggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleChangeVariable(varId, sug)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    currentVal === sug
                      ? 'bg-institucional-500 text-white border-charcoal-900'
                      : 'bg-olive-50 hover:bg-olive-200 text-charcoal-900 border-olive-400'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 6. Variables descriptivas o abiertas -> Textarea claro de alto contraste
    return (
      <textarea
        id={`var-${varId}`}
        rows={3}
        value={currentVal}
        onChange={(e) => handleChangeVariable(varId, e.target.value)}
        placeholder="Escribe tu respuesta clara y detallada aquí..."
        className="w-full p-3.5 text-sm rounded-xl border-2 border-charcoal-300 bg-white focus:border-institucional-500 text-charcoal-950 font-medium"
      />
    );
  };

  // Vista de confirmación tras completar variables o derivar a asesor
  if (submittedCode) {
    return (
      <div className="flex flex-col gap-6 py-8 text-center max-w-2xl mx-auto animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-olive-100 border-2 border-olive-600 text-olive-800 mx-auto flex items-center justify-center shadow-sm">
          <CheckCircle weight="duotone" className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-charcoal-950 font-editorial">
            {esHandoffAsesor
              ? '¡Solicitud enviada a un Asesor Jurídico!'
              : '¡Documento legal generado con éxito!'}
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-700 mt-2 leading-relaxed">
            {esHandoffAsesor
              ? 'Hemos guardado la explicación de tu caso en estado BORRADOR. El Jefe de Consultorio asignará tu solicitud a un Asesor Jurídico.'
              : `Tu documento ha sido diligenciado usando la plantilla "${subcategoriaActual?.plantilla}" y registrado en estado BORRADOR.`}
          </p>
        </div>

        <div className="p-5 bg-olive-50 rounded-2xl border-2 border-olive-400 flex flex-col gap-2">
          <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
            Código de seguimiento del caso
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-black text-institucional-700 tracking-wider">
              {submittedCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label="Copiar código al portapapeles"
              className="p-2.5 rounded-xl bg-white border-2 border-olive-400 text-charcoal-900 hover:bg-olive-100 transition"
            >
              <Copy weight="duotone" className="w-5 h-5" />
            </button>
          </div>
          {copied && <span className="text-xs text-olive-800 font-bold">¡Código copiado!</span>}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-2 flex-wrap">
          {/* El ciudadano/usuario que completa el trámite únicamente descarga el PDF oficial estructurado */}
          {(submittedPdfUrl || submittedDocUrl) && (
            <a
              href={submittedPdfUrl || `/api/casos/${encodeURIComponent(submittedCode)}/pdf`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[50px] px-4 py-3 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-black text-sm flex items-center justify-center gap-2 border-2 border-charcoal-950 shadow-sm transition"
            >
              <DownloadSimple weight="bold" className="w-5 h-5" />
              <span>Descargar Documento Oficial (.pdf)</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => navigate(`/estado/${encodeURIComponent(submittedCode)}`)}
            className="flex-1 min-h-[50px] px-4 py-3 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white font-bold text-sm border-2 border-charcoal-950 transition"
          >
            Ver estado y progreso del trámite
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 min-h-[50px] px-4 py-3 rounded-xl bg-white hover:bg-charcoal-50 text-charcoal-900 font-bold text-sm border-2 border-charcoal-800 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Barra superior con navegación atrás e indicador de estado de la máquina */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleAnterior}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-charcoal-800 hover:text-charcoal-950 py-2 px-3 rounded-xl hover:bg-olive-100 border-2 border-charcoal-300 bg-white transition"
        >
          <ArrowLeft weight="bold" className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-charcoal-950 bg-olive-200 px-3.5 py-1.5 rounded-full border-2 border-olive-400">
          {estadoFlujo === 'ESPERANDO_CATEGORIA' && 'Nivel 1: Categoría Principal'}
          {estadoFlujo === 'ESPERANDO_SUBCATEGORIA' && 'Nivel 2: Situación Específica'}
          {estadoFlujo === 'RECOLECTANDO_VARIABLES' &&
            `Paso ${indiceVariable + 1} de ${variablesRequeridas.length}`}
          {estadoFlujo === 'REQUIERE_ASESOR' && 'Derivación a Asesor'}
          {estadoFlujo === 'RESUMEN_FINAL' && 'Confirmación de Plantilla'}
        </span>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border-2 border-red-600 rounded-2xl text-xs font-bold text-red-950 flex items-start gap-2.5"
        >
          <WarningCircle weight="duotone" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

          {/* NIVEL 1: ESPERANDO_CATEGORIA */}
      {estadoFlujo === 'ESPERANDO_CATEGORIA' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <div className="bg-charcoal-900 text-white p-6 sm:p-8 rounded-3xl border-2 border-charcoal-950 shadow-sm">
            <h3 className="text-2xl sm:text-3xl font-black text-white font-editorial">
              ¿En qué área general se encuentra tu problema?
            </h3>
            <p className="text-sm text-olive-100 mt-1.5">
              Selecciona el tema principal de tu solicitud:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {arbol.map((cat, idx) => {
              const letra = cat.letra || ['A', 'B', 'C', 'D', 'E'][idx] || String(idx + 1);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategoria(cat)}
                  className="w-full min-h-[96px] p-6 rounded-2xl border-2 border-charcoal-300 hover:border-institucional-500 bg-white hover:bg-olive-50 text-left transition flex items-center justify-between gap-4 shadow-sm group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-charcoal-900 group-hover:bg-institucional-600 transition-colors text-white font-black text-base flex items-center justify-center shrink-0 border border-olive-400">
                      {renderCategoriaIcon(cat.id)}
                    </div>
                    <div>
                      <span className="font-black text-lg text-charcoal-950 block font-editorial">
                        {letra}. {cat.titulo}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    weight="bold"
                    className="w-5 h-5 text-institucional-600 shrink-0 group-hover:translate-x-1 transition-transform"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* NIVEL 2: ESPERANDO_SUBCATEGORIA */}
      {estadoFlujo === 'ESPERANDO_SUBCATEGORIA' && categoriaActual && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <div className="bg-charcoal-900 text-white p-6 sm:p-8 rounded-3xl border-2 border-charcoal-950 shadow-sm">
            <span className="text-xs font-mono font-bold uppercase text-olive-300">
              {categoriaActual.titulo}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 font-editorial">
              Selecciona tu situación específica
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {categoriaActual.subcategorias.map((sub) => {
              const esOtra =
                sub.accion === 'handoff_asesor' ||
                sub.id.toLowerCase().startsWith('otra') ||
                sub.descripcion.toLowerCase().startsWith('otra');

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectSubcategoria(sub)}
                  className={`w-full p-6 rounded-2xl border-2 text-left transition flex items-center justify-between gap-4 shadow-sm ${
                    esOtra
                      ? 'border-amber-600 bg-amber-50/90 hover:bg-amber-100 text-charcoal-950 lg:col-span-2'
                      : 'border-charcoal-300 bg-white hover:border-institucional-500 hover:bg-olive-50 text-charcoal-950'
                  }`}
                >
                  <div className="space-y-1.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase ${
                        esOtra
                          ? 'bg-amber-200 text-amber-950'
                          : 'bg-olive-200 text-charcoal-950 border border-olive-400'
                      }`}
                    >
                      {esOtra ? 'Atención con Asesor' : sub.mecanismo || 'Trámite Automático'}
                    </span>

                    <p className="font-black text-base leading-snug text-charcoal-950">
                      {esOtra ? `Otra (${sub.descripcion})` : sub.descripcion}
                    </p>
                  </div>

                  <ArrowRight weight="bold" className="w-5 h-5 text-charcoal-700 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FLUJO "OTRA" -> ESTADO REQUIERE_ASESOR */}
      {estadoFlujo === 'REQUIERE_ASESOR' && (
        <div className="flex flex-col gap-5 p-6 sm:p-8 rounded-3xl bg-white border-2 border-charcoal-800 shadow-sm animate-fadeIn">
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-600 space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase text-amber-900">
              Atención por Asesor Humano ({categoriaActual?.titulo})
            </span>
            <p className="text-sm font-black text-charcoal-950 leading-relaxed">
              "Por favor, indícanos tus datos básicos y explícame brevemente tu caso. Un asesor revisará tu situación y se contactará contigo."
            </p>
          </div>

          {/* Nombre y Apellido en 2 columnas + Municipio con Autocompletado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="otra_nombres"
                className="block text-xs font-black uppercase text-charcoal-800 mb-1.5"
              >
                Nombre(s)
              </label>
              <input
                id="otra_nombres"
                type="text"
                value={nombresOtra}
                onChange={(e) => setNombresOtra(e.target.value)}
                placeholder="Ej: Pedro Nel"
                className="w-full min-h-[48px] px-3.5 py-2 text-sm rounded-xl border-2 border-charcoal-300 focus:border-institucional-500 text-charcoal-950"
              />
            </div>

            <div>
              <label
                htmlFor="otra_apellidos"
                className="block text-xs font-black uppercase text-charcoal-800 mb-1.5"
              >
                Apellido(s)
              </label>
              <input
                id="otra_apellidos"
                type="text"
                value={apellidosOtra}
                onChange={(e) => setApellidosOtra(e.target.value)}
                placeholder="Ej: Ospina Valencia"
                className="w-full min-h-[48px] px-3.5 py-2 text-sm rounded-xl border-2 border-charcoal-300 focus:border-institucional-500 text-charcoal-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MunicipalityAutocomplete
              id="municipio_otra"
              label="Municipio de tu vereda"
              value={municipioOtra}
              onChange={(val) => setMunicipioOtra(val)}
              placeholder="Escribe para buscar tu municipio..."
            />

            <div>
              <label
                htmlFor="telefono_otra"
                className="block text-xs font-black uppercase text-charcoal-800 mb-1.5"
              >
                Número de WhatsApp / Teléfono de contacto
              </label>
              <input
                id="telefono_otra"
                type="tel"
                value={telefonoContactoOtra}
                onChange={(e) => setTelefonoContactoOtra(e.target.value)}
                placeholder="Ej: +57 310 123 4567"
                className="w-full min-h-[48px] px-3.5 py-2 text-sm rounded-xl border-2 border-charcoal-300 focus:border-institucional-500 text-charcoal-950"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="explicacion_otra"
              className="block text-xs font-black uppercase text-charcoal-800 mb-1.5"
            >
              Explicación breve de tu caso *
            </label>
            <textarea
              id="explicacion_otra"
              rows={4}
              value={explicacionOtra}
              onChange={(e) => setExplicacionOtra(e.target.value)}
              placeholder="Escribe aquí qué ocurrió con tu caso y qué necesitas..."
              className="w-full p-3.5 text-sm rounded-xl border-2 border-charcoal-300 focus:border-institucional-500 text-charcoal-950"
            />
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmitOtraAsesor}
            className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white font-black text-sm flex items-center justify-center gap-2 border-2 border-charcoal-950 shadow-sm disabled:opacity-50 transition"
          >
            {isSubmitting ? (
              <>
                <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" />
                <span>Guardando caso para el asesor...</span>
              </>
            ) : (
              <>
                <UserCheck weight="duotone" className="w-5 h-5 text-aqua-300" />
                <span>Enviar caso al Asesor Jurídico</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* PASO 4: RECOLECTANDO_VARIABLES */}
      {estadoFlujo === 'RECOLECTANDO_VARIABLES' && subcategoriaActual && variableActual && (
        <div className="flex flex-col gap-6 p-6 sm:p-10 rounded-3xl bg-white border-2 border-charcoal-800 shadow-sm animate-fadeIn max-w-4xl">
          {/* Barra de progreso de variables */}
          <div
            className="grid gap-2 w-full"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, variablesRequeridas.length)}, minmax(0, 1fr))`,
            }}
          >
            {variablesRequeridas.map((v, i) => (
              <div
                key={v.id}
                className={`h-2.5 rounded-full transition-all ${
                  i < indiceVariable
                    ? 'bg-olive-500'
                    : i === indiceVariable
                    ? 'bg-institucional-500'
                    : 'bg-charcoal-200'
                }`}
              />
            ))}
          </div>

          <div className="space-y-4 py-2">
            <label
              htmlFor={`var-${variableActual.id}`}
              className="block text-xl sm:text-2xl font-black text-charcoal-950 leading-snug font-editorial"
            >
              {variableActual.pregunta.replace(/\*/g, '')}
            </label>

            {isEvidenceVariable(variableActual.id, variableActual.pregunta) && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 text-amber-950 animate-fadeIn">
                <Info weight="duotone" className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm space-y-1">
                  <p className="font-black text-amber-900">
                    💡 Sugerencia sobre pruebas y soportes:
                  </p>
                  <p className="leading-relaxed">
                    Te recomendamos reunir <strong>todas las pruebas que tengas a la mano</strong> (fórmulas médicas, historias clínicas, recibos, fotos, constancias o derechos de petición previos).
                  </p>
                  <p className="leading-relaxed text-amber-800">
                    📌 <strong>Importante:</strong> Estos anexos <strong>se envían por separado</strong> (como archivos adjuntos o copias físicas) al momento de radicar tu solicitud ante la entidad o juzgado; el escrito generado no requiere listado interno de anexos.
                  </p>
                </div>
              </div>
            )}

            {renderSmartVariableInput(variableActual)}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-charcoal-100">
            <button
              type="button"
              onClick={handleAnterior}
              className="sm:w-1/3 min-h-[52px] px-4 py-2.5 rounded-xl border-2 border-charcoal-700 text-charcoal-900 font-bold text-sm hover:bg-charcoal-50 transition"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={handleSiguienteVariable}
              className="sm:w-2/3 min-h-[52px] px-5 py-2.5 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white font-black text-sm flex items-center justify-center gap-2 border-2 border-charcoal-950 shadow-sm transition"
            >
              <span>
                {indiceVariable + 1 < variablesRequeridas.length
                  ? 'Siguiente pregunta'
                  : 'Revisar datos'}
              </span>
              <ArrowRight weight="bold" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* RESUMEN FINAL Y GENERACIÓN DE PLANTILLA */}
      {estadoFlujo === 'RESUMEN_FINAL' && subcategoriaActual && (
        <div className="flex flex-col gap-6 p-6 sm:p-10 rounded-3xl bg-white border-2 border-charcoal-800 shadow-sm animate-fadeIn max-w-5xl">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-charcoal-950 font-editorial">
              Confirma tus respuestas
            </h3>
            <p className="text-sm text-charcoal-600 mt-1">
              Revisa que la información esté correcta antes de crear tu documento:
            </p>
          </div>

          {/* Aviso sobre pruebas y anexos para envío por separado */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 flex items-start gap-3 text-amber-950">
            <Paperclip weight="duotone" className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-black text-amber-900">
                Sobre tus pruebas y anexos (envío por separado):
              </span>
              <p className="text-amber-900 leading-relaxed">
                Recuerda reunir y enviar por separado copias de todas las pruebas que tengas a la mano al radicar este documento (cédula, fórmulas médicas, recibos, certificados o historias clínicas). Este documento legal se genera listo y limpio de secciones de anexos para que adjuntes tus soportes libremente ante la entidad o juzgado al radicarlo.
              </p>
            </div>
          </div>

          <div className="bg-olive-50/70 p-5 rounded-2xl border border-olive-300 text-xs grid grid-cols-1 md:grid-cols-2 gap-4">
            {variablesRequeridas.map((v) => (
              <div
                key={v.id}
                className="bg-white p-4 rounded-xl border border-olive-200 flex flex-col gap-1"
              >
                <span className="font-bold text-charcoal-600 text-xs">
                  {v.pregunta.replace(/\*/g, '')}
                </span>
                <span className="font-black text-sm text-charcoal-950 break-words">
                  {respuestas[v.id] || '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleAnterior}
              className="sm:w-1/3 min-h-[52px] px-4 py-2.5 rounded-xl border-2 border-charcoal-700 text-charcoal-900 font-bold text-sm hover:bg-charcoal-50 transition"
            >
              Modificar
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitPlantilla}
              className="sm:w-2/3 min-h-[52px] px-5 py-2.5 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white font-black text-sm flex items-center justify-center gap-2 border-2 border-charcoal-950 shadow-md disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <>
                  <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" />
                  <span>Generando .docx...</span>
                </>
              ) : (
                <>
                  <FileDoc weight="duotone" className="w-5 h-5 text-aqua-300" />
                  <span>Generar Documento</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
