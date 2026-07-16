export const uploadToCloudinary = async (file) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.replace(/^["']|["']$/g, '');
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.replace(/^["']|["']$/g, '');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('quality', 'auto:best');
  formData.append('fetch_format', 'auto');

  // For avatars — don't resize, keep original quality
  if (file.type.startsWith('image/')) {
    formData.append('flags', 'preserve_transparency');
  }

  const resourceType = file.type.startsWith('image/') ? 'image' : 'auto';

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) throw new Error('Upload failed');

  const data = await response.json();

  // For images — request highest quality URL
  let url = data.secure_url;
  if (file.type.startsWith('image/')) {
    // Remove any auto transformations Cloudinary adds
    url = data.secure_url.replace('/upload/', '/upload/q_100,f_auto/');
  }

  return {
    url,
    name: file.name,
    type: file.type,
    size: file.size
  };
};