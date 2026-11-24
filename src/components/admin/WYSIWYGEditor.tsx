import { sanitizeHtml } from '@/lib/sanitize-html';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Undo,
  Redo,
  Eye,
  Code2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WYSIWYGEditorProps {
  content: string;
  onChange: (content: string) => void;
  onAutoSave?: (content: string) => void;
  autoSaveInterval?: number;
}

const WYSIWYGEditor = ({ content, onChange, onAutoSave, autoSaveInterval = 30000 }: WYSIWYGEditorProps) => {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceContent, setSourceContent] = useState(content);
  const [isPreview, setIsPreview] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      setSourceContent(html);
    },
  });

  // Auto-save
  useEffect(() => {
    if (!onAutoSave) return;

    const interval = setInterval(() => {
      const currentContent = isSourceMode ? sourceContent : (editor?.getHTML() || '');
      onAutoSave(currentContent);
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [onAutoSave, autoSaveInterval, isSourceMode, sourceContent, editor]);

  // Sync source mode changes
  useEffect(() => {
    if (!isSourceMode && editor) {
      editor.commands.setContent(sourceContent);
    }
  }, [isSourceMode, sourceContent, editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('URL da imagem:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    const url = window.prompt('URL do link:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return <div className="animate-pulse bg-muted h-64 rounded-lg" />;
  }

  if (isPreview) {
    return (
      <div className="border border-border rounded-lg">
        <div className="flex items-center justify-between p-2 border-b border-border bg-muted/50">
          <span className="text-sm font-medium">Preview</span>
          <Button variant="ghost" size="sm" onClick={() => setIsPreview(false)}>
            <Code2 className="w-4 h-4 mr-1" /> Editar
          </Button>
        </div>
        <div 
          className="p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(isSourceMode ? sourceContent : editor.getHTML()) }}
        />
      </div>
    );
  }

  if (isSourceMode) {
    return (
      <div className="border border-border rounded-lg">
        <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/50 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSourceMode(false)}
            className="text-primary"
          >
            <Bold className="w-4 h-4 mr-1" /> Visual
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsPreview(true)}>
            <Eye className="w-4 h-4 mr-1" /> Preview
          </Button>
        </div>
        <Textarea
          value={sourceContent}
          onChange={(e) => {
            setSourceContent(e.target.value);
            onChange(e.target.value);
          }}
          className="min-h-[400px] font-mono text-sm border-0 rounded-t-none resize-y"
          placeholder="Cole seu HTML aqui..."
        />
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/50 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(editor.isActive('bold') && 'bg-muted')}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(editor.isActive('italic') && 'bg-muted')}
        >
          <Italic className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(editor.isActive('heading', { level: 1 }) && 'bg-muted')}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(editor.isActive('heading', { level: 2 }) && 'bg-muted')}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(editor.isActive('heading', { level: 3 }) && 'bg-muted')}
        >
          <Heading3 className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(editor.isActive('bulletList') && 'bg-muted')}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(editor.isActive('orderedList') && 'bg-muted')}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button variant="ghost" size="sm" onClick={addLink}>
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={addImage}>
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(editor.isActive('codeBlock') && 'bg-muted')}
        >
          <Code className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="w-4 h-4" />
        </Button>
        
        <div className="flex-1" />
        
        <Button variant="ghost" size="sm" onClick={() => setIsSourceMode(true)}>
          <Code2 className="w-4 h-4 mr-1" /> HTML
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsPreview(true)}>
          <Eye className="w-4 h-4 mr-1" /> Preview
        </Button>
      </div>
      
      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="min-h-[400px] p-4 prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[350px]"
      />
    </div>
  );
};

export default WYSIWYGEditor;
