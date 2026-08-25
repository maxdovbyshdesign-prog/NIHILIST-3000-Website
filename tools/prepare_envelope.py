import bpy
import os
import sys


def argument_after_separator(index: int) -> str:
    argv = sys.argv
    separator = argv.index("--")
    return argv[separator + index]


source_path = argument_after_separator(1)
output_path = argument_after_separator(2)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source_path)

keep = {"body", "paper", "valve"}
for obj in list(bpy.data.objects):
    if obj.name not in keep:
        bpy.data.objects.remove(obj, do_unlink=True)

for obj in bpy.data.objects:
    obj.select_set(obj.name in keep)
    if obj.type == "MESH":
        obj.data.materials.clear()

os.makedirs(os.path.dirname(output_path), exist_ok=True)
bpy.context.view_layer.objects.active = bpy.data.objects.get("body")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    use_selection=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
)

print(f"Prepared envelope: {output_path}")
