import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase, supabaseConfigurado, SUPABASE_BUCKET } from '../services/supabase';

// Converte a imagem capturada (URI/webPath do Capacitor) em um File,
// formato aceito pelo Supabase Storage.
async function uriParaFile(webPath, formato = 'jpeg') {
  const resposta = await fetch(webPath);
  const blob = await resposta.blob();
  const extensao = formato === 'jpg' ? 'jpeg' : formato;
  const tipo = blob.type || `image/${extensao}`;
  const nomeArquivo = `pet-${Date.now()}.${formato}`;
  return new File([blob], nomeArquivo, { type: tipo });
}

// Envia o arquivo ao bucket e devolve a URL pública da imagem.
async function enviarFotoSupabase(file) {
  if (!supabaseConfigurado) {
    throw new Error('Supabase não configurado. Crie o arquivo .env (veja .env.example).');
  }

  const caminho = `pets/${file.name}`;

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(caminho, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}

export default function PetHealthApp() {
  const [fotoPet, setFotoPet] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusTipo, setStatusTipo] = useState(''); // 'ok', 'erro', 'aviso'
  const [enviando, setEnviando] = useState(false);
  const [urlPublica, setUrlPublica] = useState('');

  // ===== Função principal: captura de foto com tratamento de exceção =====
  const capturarPet = async () => {
    try {
      // 1. Verificar e solicitar permissões do sistema operacional
      let permissoes;
      try {
        permissoes = await Camera.checkPermissions();
        if (permissoes.camera !== 'granted' || permissoes.photos !== 'granted') {
          const resultado = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
          if (resultado.camera !== 'granted' && resultado.photos !== 'granted') {
            setStatusMsg('⚠️ Permissão negada. Libere a câmera nas configurações do aparelho.');
            setStatusTipo('erro');
            return;
          }
        }
      } catch (e) {
        // Em alguns dispositivos/versões, checkPermissions pode não estar disponível
        // O getPhoto já solicita permissão internamente
        console.log('Verificação de permissão ignorada:', e.message);
      }

      // 2. Abrir câmera/galeria via prompt nativo do Android
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,           // Mostra diálogo "Câmera ou Galeria"
        promptLabelHeader: 'Foto do Pet',       // Título do diálogo
        promptLabelPhoto: 'Escolher da Galeria',
        promptLabelPicture: 'Tirar Foto com Câmera',
        promptLabelCancel: 'Cancelar'
      });

      // 3. Mostrar a prévia local imediatamente
      setFotoPet(image.webPath);
      setUrlPublica('');
      setEnviando(true);
      setStatusMsg('⏳ Enviando foto para a nuvem...');
      setStatusTipo('aviso');

      // 4. Converter para File e fazer upload no Supabase Storage
      const file = await uriParaFile(image.webPath, image.format || 'jpeg');
      const url = await enviarFotoSupabase(file);

      // 5. Renderizar a imagem a partir da URL pública da nuvem
      setFotoPet(url);
      setUrlPublica(url);
      setStatusMsg('✅ Foto enviada para o Supabase com sucesso!');
      setStatusTipo('ok');

    } catch (error) {
      // 6. TRATAMENTO DE EXCEÇÃO — captura cancelamento e erros
      const msg = String((error && error.message) || error);

      if (/cancel/i.test(msg) || /User cancelled/i.test(msg)) {
        // Usuário cancelou a ação (apertou Voltar ou "Cancelar")
        setStatusMsg('📷 Captura cancelada. Nenhuma foto foi adicionada.');
        setStatusTipo('aviso');
      } else {
        // Outro erro inesperado
        setStatusMsg('❌ Erro ao capturar/enviar a foto: ' + msg);
        setStatusTipo('erro');
      }
      console.warn('Camera.getPhoto error:', error);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* ===== Cabeçalho ===== */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>🐾</span>
        <h1 style={styles.title}>Carteirinha Pet Vacina</h1>
        <p style={styles.subtitle}>Cadastro do animal de estimação</p>
      </div>

      {/* ===== Área da foto de perfil ===== */}
      <div style={styles.photoSection}>
        <div style={styles.photoFrame}>
          {fotoPet ? (
            <img
              src={fotoPet}
              alt="Foto do Pet"
              style={styles.petPhoto}
            />
          ) : (
            <div style={styles.placeholder}>
              <span style={styles.placeholderIcon}>📸</span>
              <span style={styles.placeholderText}>Sem foto</span>
            </div>
          )}
        </div>

        {/* ===== Botão para capturar foto ===== */}
        <button
          onClick={capturarPet}
          disabled={enviando}
          style={{ ...styles.captureButton, opacity: enviando ? 0.6 : 1 }}
        >
          <span style={styles.btnIcon}>📷</span>
          {enviando
            ? 'Enviando...'
            : fotoPet ? 'Trocar Foto do Pet' : 'Selecionar Foto do Pet'}
        </button>
      </div>

      {/* ===== Mensagem de status (feedback ao usuário) ===== */}
      {statusMsg && (
        <div style={{
          ...styles.statusBox,
          backgroundColor: statusTipo === 'ok' ? '#dcfce7'
            : statusTipo === 'erro' ? '#fde8e6'
            : '#fef9c3',
          color: statusTipo === 'ok' ? '#166534'
            : statusTipo === 'erro' ? '#991b1b'
            : '#854d0e',
          borderColor: statusTipo === 'ok' ? '#86efac'
            : statusTipo === 'erro' ? '#fca5a5'
            : '#fde047'
        }}>
          {statusMsg}
        </div>
      )}

      {/* ===== Informações do cadastro ===== */}
      <div style={styles.infoCard}>
        <h3 style={styles.infoTitle}>📋 Informações do Pet</h3>
        <div style={styles.infoRow}>
          <span style={styles.label}>Nome:</span>
          <span style={styles.value}>Meu Pet</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.label}>Status da Foto:</span>
          <span style={{
            ...styles.badge,
            backgroundColor: fotoPet ? '#dcfce7' : '#fde8e6',
            color: fotoPet ? '#166534' : '#991b1b'
          }}>
            {urlPublica ? '✓ Salva na nuvem' : fotoPet ? '… Enviando' : '✗ Sem foto'}
          </span>
        </div>
        {urlPublica && (
          <div style={styles.infoRow}>
            <span style={styles.label}>URL pública:</span>
            <a href={urlPublica} target="_blank" rel="noreferrer" style={styles.link}>
              Abrir imagem
            </a>
          </div>
        )}
      </div>

      {/* ===== Requisitos técnicos demonstrados ===== */}
      <div style={styles.techCard}>
        <h4 style={styles.techTitle}>⚙️ Funcionalidades Implementadas</h4>
        <ul style={styles.techList}>
          <li>✅ @capacitor/camera instalado e sincronizado</li>
          <li>✅ Permissões de câmera e armazenamento configuradas</li>
          <li>✅ Camera.getPhoto com CameraSource.Prompt</li>
          <li>✅ allowEditing: true</li>
          <li>✅ Renderização condicional com useState</li>
          <li>✅ Tratamento de exceção (try/catch)</li>
          <li>✅ Conversão URI → File e upload no Supabase Storage</li>
          <li>✅ URL pública da imagem renderizada na tela</li>
        </ul>
      </div>
    </div>
  );
}

// ===== Estilos inline para o componente =====
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '0',
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
  },
  header: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: '#f1f5f9',
    padding: '32px 20px 28px',
    textAlign: 'center',
    borderRadius: '0 0 24px 24px',
    marginBottom: '24px',
  },
  headerIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '8px',
  },
  title: {
    margin: '0',
    fontSize: '26px',
    fontWeight: '900',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '14px',
    opacity: 0.75,
    letterSpacing: '0.04em',
  },
  photoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 20px',
    marginBottom: '20px',
  },
  photoFrame: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    border: '4px solid #dc2626',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    marginBottom: '16px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
  },
  petPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: '#94a3b8',
  },
  placeholderIcon: {
    fontSize: '40px',
    marginBottom: '4px',
  },
  placeholderText: {
    fontSize: '12px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  captureButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '999px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
    transition: 'transform 0.12s ease',
  },
  btnIcon: {
    fontSize: '20px',
  },
  statusBox: {
    margin: '0 20px 20px',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    border: '1.5px solid',
    textAlign: 'center',
  },
  infoCard: {
    margin: '0 20px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '18px',
    border: '1.5px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  infoTitle: {
    margin: '0 0 14px',
    fontSize: '17px',
    fontWeight: '800',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderTop: '1px dashed #e2e8f0',
  },
  label: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '600',
  },
  value: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
  },
  link: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#dc2626',
  },
  badge: {
    fontSize: '12px',
    fontWeight: '800',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  techCard: {
    margin: '0 20px 32px',
    backgroundColor: '#f0f9ff',
    borderRadius: '16px',
    padding: '18px',
    border: '1.5px solid #bae6fd',
  },
  techTitle: {
    margin: '0 0 10px',
    fontSize: '15px',
    fontWeight: '800',
    color: '#0c4a6e',
  },
  techList: {
    margin: '0',
    padding: '0',
    listStyle: 'none',
    fontSize: '13px',
    color: '#0369a1',
    lineHeight: '1.8',
  },
};
