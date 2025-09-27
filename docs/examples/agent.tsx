import React, { useState, useEffect, useCallback } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { Shape, Connector, ShapeType, Diagram } from "../types";
import { SHAPE_DEFAULTS, CONNECTOR_DEFAULTS } from "../constants";
import { autoLayout } from "../utils/layout";

interface AIAssistantProps {
  onGenerate: (data: { shapes: Shape[]; connectors: Connector[] }) => void;
  diagram: Diagram;
}

const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

const ImageUploadIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

const PasteIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

// Helper function to resize an image file while preserving aspect ratio
const resizeImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const MAX_DIMENSION = 1024; // Max width or height of 1024px
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result)
        return reject(new Error("File could not be read."));

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // If the image is already small enough, no need to resize
        if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
          resolve(file);
          return;
        }

        // Calculate new dimensions while preserving aspect ratio
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Could not get canvas context"));
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to a blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Canvas to Blob conversion failed"));
            }
            // Create a new file from the resized blob
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          },
          file.type,
          0.9
        ); // Use original mime type, and quality 0.9 for formats like jpeg
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const AIAssistant: React.FC<AIAssistantProps> = ({ onGenerate, diagram }) => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{
    base64: string;
    mimeType: string;
    name: string;
  } | null>(null);

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      shapes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: {
              type: Type.STRING,
              description: 'A unique identifier for the shape, e.g., "shape1".',
            },
            type: {
              type: Type.STRING,
              description: `The shape type. Must be one of: ${Object.values(ShapeType).join(", ")}.`,
            },
            text: {
              type: Type.STRING,
              description: "The text label inside the shape.",
            },
          },
          required: ["id", "type", "text"],
        },
      },
      connectors: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            from: {
              type: Type.STRING,
              description: "The id of the shape where the connector starts.",
            },
            to: {
              type: Type.STRING,
              description: "The id of the shape where the connector ends.",
            },
            text: {
              type: Type.STRING,
              description: "Optional text label for the connector.",
            },
          },
          required: ["from", "to"],
        },
      },
    },
    required: ["shapes", "connectors"],
  };

  const fileToBase64 = (
    file: File
  ): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processImageFile = useCallback(async (file: File | null) => {
    if (!file) return;
    try {
      if (!file.type.startsWith("image/")) {
        setError("Please paste or upload a valid image file.");
        return;
      }

      // Resize the image before processing to improve performance.
      const resizedFile = await resizeImage(file);

      const MAX_SIZE = 4 * 1024 * 1024; // 4MB
      if (resizedFile.size > MAX_SIZE) {
        setError(
          "Image size is too large, even after resizing. Please use an image under 4MB."
        );
        return;
      }

      setError(null);
      const { base64, mimeType } = await fileToBase64(resizedFile);
      setImageData({
        base64,
        mimeType,
        name: resizedFile.name || "pasted_image.png",
      });
    } catch (err) {
      console.error("Error processing image file:", err);
      setError("Could not process the image file.");
    }
  }, []);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isLoading) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            event.preventDefault();
            return;
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [isLoading, processImageFile]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
    event.target.value = "";
  };

  const handlePasteButtonClick = () => {
    if (isLoading) return;
    // The Clipboard API is often blocked by browser permissions policies in sandboxed environments.
    // Instead of making a failing API call, we instruct the user to use the reliable Ctrl+V method,
    // which is handled by our document-level 'paste' event listener. This avoids console errors.
    setError(
      "Panoya erişim tarayıcı tarafından engellendi. Lütfen bunun yerine bir resim yapıştırmak için Ctrl+V (veya Mac'te Cmd+V) kullanın."
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !imageData) {
      setError("Please describe the diagram or upload an image.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const isEditing = diagram && diagram.shapes.length > 0;
      let systemInstructionText = "";

      if (isEditing) {
        const leanDiagram = {
          shapes: diagram.shapes.map(({ id, type, text }) => ({
            id,
            type,
            text,
          })),
          connectors: diagram.connectors.map(({ id, from, to, text }) => ({
            id,
            from,
            to,
            text,
          })),
        };
        const diagramJson = JSON.stringify(leanDiagram);

        systemInstructionText = `You are an AI assistant that modifies diagram structures represented in JSON. The user will provide an instruction to modify the current diagram.
You MUST return the *entire*, updated diagram JSON based on the user's request.
- When returning the JSON, preserve the IDs of existing shapes and connectors.
- When adding new elements, create new, unique IDs.
- Ensure all connector 'from' and 'to' IDs correctly reference shape IDs.
- The current diagram is: ${diagramJson}`;
      } else {
        systemInstructionText = `You are an AI that generates flow diagrams from user descriptions.
- You must generate a JSON object representing the diagram.
- Use simple, concise text for shapes.
- Ensure all connector 'from' and 'to' IDs correspond to a shape ID.`;
      }

      const textPart = { text: prompt };

      const parts = [
        ...(imageData
          ? [
              {
                inlineData: {
                  mimeType: imageData.mimeType,
                  data: imageData.base64,
                },
              },
            ]
          : []),
        textPart,
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts },
        config: {
          systemInstruction: systemInstructionText,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const jsonText = response.text.trim();
      const parsed = JSON.parse(jsonText);

      if (!parsed.shapes || !parsed.connectors) {
        throw new Error(
          "Invalid JSON structure from AI. Missing 'shapes' or 'connectors'."
        );
      }

      const createdShapes: Shape[] = parsed.shapes.map((s: any) => {
        const type = Object.values(ShapeType).includes(s.type as ShapeType)
          ? (s.type as ShapeType)
          : ShapeType.RECTANGLE;
        const existingShape = isEditing
          ? diagram.shapes.find((es) => es.id === s.id)
          : undefined;
        return {
          ...(existingShape || SHAPE_DEFAULTS[type]),
          id: s.id,
          type,
          text: s.text || "Text",
          x: existingShape?.x ?? 0,
          y: existingShape?.y ?? 0,
        };
      });
      const createdConnectors: Connector[] = parsed.connectors
        .filter(
          (c: any) =>
            createdShapes.find((s) => s.id === c.from) &&
            createdShapes.find((s) => s.id === c.to)
        )
        .map((c: any, i: number) => {
          const existingConnector = isEditing
            ? diagram.connectors.find(
                (ec) => ec.id === c.id || (ec.from === c.from && ec.to === c.to)
              )
            : undefined;
          return {
            ...(existingConnector || CONNECTOR_DEFAULTS),
            id: existingConnector?.id || `conn-ai-${i}-${Date.now()}`,
            from: c.from,
            to: c.to,
            text: c.text || "",
          };
        });

      const { shapes, connectors } = autoLayout(
        createdShapes,
        createdConnectors
      );
      onGenerate({ shapes, connectors });
      setPrompt("");
      setImageData(null);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to generate diagram. Please check your prompt or try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const baseButtonClass = `text-sm border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md p-2 flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed transition-colors flex-grow`;
  const enabledButtonClass = `bg-white text-slate-500 hover:border-blue-500 hover:text-blue-600`;
  const disabledButtonClass = `bg-slate-100 text-slate-400 cursor-not-allowed`;

  return (
    <div className="w-full h-full flex flex-col gap-3">
      <div className="relative">
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the diagram you want to create or modify..."
          className="w-full text-sm bg-slate-50 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md resize-none p-2"
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="image-upload"
          className={`${baseButtonClass} ${isLoading ? disabledButtonClass : enabledButtonClass}`}
        >
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={isLoading}
          />
          <ImageUploadIcon />
          <span>Upload</span>
        </label>
        <button
          onClick={handlePasteButtonClick}
          disabled={isLoading}
          className={`${baseButtonClass} ${isLoading ? disabledButtonClass : enabledButtonClass}`}
        >
          <PasteIcon />
          <span>Paste</span>
        </button>
      </div>

      {imageData && (
        <div className="mt-2 p-2 bg-slate-100 rounded-md flex items-center justify-between text-sm w-full">
          <span className="truncate text-slate-700 font-medium pr-2">
            {imageData.name}
          </span>
          <button
            onClick={() => setImageData(null)}
            disabled={isLoading}
            className="text-red-500 hover:text-red-700 disabled:text-slate-400 disabled:cursor-not-allowed flex-shrink-0"
          >
            <TrashIcon />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center h-10"
      >
        {isLoading ? <LoadingSpinner /> : "Generate"}
      </button>
    </div>
  );
};

export default AIAssistant;
