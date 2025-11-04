import base64
import io
import json
import random
from pathlib import Path

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
from PIL import Image, ImageEnhance, ImageFilter

from .images_and_captions import IMAGES_AND_CAPTIONS

IMAGES_DIR = Path(__file__).parent.absolute() / "images"


class HelloRouteHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({
            "data": (
                "Hello, world! kunieda!"
                " This is the '/jupytercon2025-extension-workshop/hello' endpoint."
                " Try visiting me in your browser!"
            ),
        }))


class ImageAndCaptionRouteHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        random_selection = random.choice(IMAGES_AND_CAPTIONS)
        with open(IMAGES_DIR / random_selection["filename"], "rb") as f:
            b64_bytes = base64.b64encode(f.read()).decode("utf-8")

        self.finish(json.dumps({
            "b64_bytes": b64_bytes,
            "caption": random_selection["caption"],
        }))


class ImageEditRouteHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        """Apply image editing operations."""
        try:
            body = self.get_json_body()
            image_data = body.get("image_data")
            operation = body.get("operation")
            params = body.get("params", {})

            if not image_data or not operation:
                self.set_status(400)
                self.finish(json.dumps({
                    "error": "Missing image_data or operation"
                }))
                return

            # Decode base64 image
            image_bytes = base64.b64decode(image_data.split(",")[1] if "," in image_data else image_data)
            img = Image.open(io.BytesIO(image_bytes))

            # Apply the requested operation
            processed_img = self._apply_operation(img, operation, params)

            # Convert back to base64
            buffer = io.BytesIO()
            processed_img.save(buffer, format="JPEG", quality=95)
            processed_bytes = base64.b64encode(buffer.getvalue()).decode("utf-8")

            self.finish(json.dumps({
                "b64_bytes": processed_bytes,
                "status": "success"
            }))

        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({
                "error": f"Image processing failed: {str(e)}"
            }))

    def _apply_operation(self, img: Image.Image, operation: str, params: dict) -> Image.Image:
        """Apply the specified image operation."""
        if operation == "grayscale":
            return img.convert("L").convert("RGB")
        
        elif operation == "sepia":
            img = img.convert("RGB")
            width, height = img.size
            pixels = img.load()
            for py in range(height):
                for px in range(width):
                    r, g, b = pixels[px, py]
                    tr = int(0.393 * r + 0.769 * g + 0.189 * b)
                    tg = int(0.349 * r + 0.686 * g + 0.168 * b)
                    tb = int(0.272 * r + 0.534 * g + 0.131 * b)
                    pixels[px, py] = (min(tr, 255), min(tg, 255), min(tb, 255))
            return img
        
        elif operation == "blur":
            return img.filter(ImageFilter.GaussianBlur(radius=3))
        
        elif operation == "sharpen":
            return img.filter(ImageFilter.SHARPEN)
        
        elif operation == "crop":
            # Crop 50% from center
            width, height = img.size
            new_width = width // 2
            new_height = height // 2
            left = (width - new_width) // 2
            top = (height - new_height) // 2
            right = left + new_width
            bottom = top + new_height
            return img.crop((left, top, right, bottom))
        
        elif operation == "brightness":
            factor = params.get("factor", 1.0)
            enhancer = ImageEnhance.Brightness(img)
            return enhancer.enhance(factor)
        
        elif operation == "contrast":
            factor = params.get("factor", 1.0)
            enhancer = ImageEnhance.Contrast(img)
            return enhancer.enhance(factor)
        
        else:
            return img


def setup_route_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    hello_route_pattern = url_path_join(base_url, "jupytercon2025-extension-workshop", "hello")
    image_route_pattern = url_path_join(base_url, "jupytercon2025-extension-workshop", "random-image-caption")
    edit_route_pattern = url_path_join(base_url, "jupytercon2025-extension-workshop", "edit-image")

    handlers = [
        (hello_route_pattern, HelloRouteHandler),
        (image_route_pattern, ImageAndCaptionRouteHandler),
        (edit_route_pattern, ImageEditRouteHandler),
    ]

    web_app.add_handlers(host_pattern, handlers)
