KNAME := $(shell uname)
ifeq (Darwin,$(findstring Darwin,$(KNAME)))
    CPP=g++-7
else
    CPP=/usr/bin/cpp
endif

OUT=postcompiled/utils/Rasters.cpp.js postcompiled/utils/Rasters.js postcompiled/view/FragmentShaders.js postcompiled/view/VertexShaders.js

all: $(OUT)

run:
	emrun --browser chrome postcompiled/utils/Rasters.cpp.html

postcompiled/utils/Rasters.cpp.js:
	em++ --emrun --bind --profiling-funcs -std=c++11 \
	-I precompiled/utils/cpp/inc \
	-g precompiled/utils/cpp/src/*.cpp \
	-g precompiled/utils/cpp/Rasters.cpp \
	-s WASM=1 -s DEMANGLE_SUPPORT=1 -s ASSERTIONS=1 -s SAFE_HEAP=1 -s ALLOW_MEMORY_GROWTH=1 \
	-s EXPORT_NAME="'Rasters'" -s MODULARIZE=1 \
	-o postcompiled/utils/Rasters.cpp.html

postcompiled/utils/Rasters.js : precompiled/utils/Rasters.js
	$(CPP) -E -P -I. -xc -Wundef -std=c99 -nostdinc -Wtrigraphs -fdollars-in-identifiers -C $< > $@

postcompiled/view/FragmentShaders.js : precompiled/view/fragment/FragmentShaders.template.js
	cat $< | \
    sed '/GENERIC.GLSL.C/ r precompiled/view/fragment/generic.glsl.c' | \
    sed '/REALISTIC.GLSL.C/ r precompiled/view/fragment/realistic.glsl.c' | \
    sed '/DEBUG.GLSL.C/ r precompiled/view/fragment/debug.glsl.c' | \
    sed '/VECTOR_FIELD.GLSL.C/ r precompiled/view/fragment/vector_field.glsl.c' \
    > postcompiled/view/FragmentShaders.js

postcompiled/view/VertexShaders.js : precompiled/view/vertex/VertexShaders.template.js
	cat $< | \
    sed '/TEMPLATE.GLSL.C/ r precompiled/view/vertex/template.glsl.c' | \
    sed '/EQUIRECTANGULAR.GLSL.C/ r precompiled/view/vertex/equirectangular.glsl.c' | \
    sed '/TEXTURE.GLSL.C/ r precompiled/view/vertex/texture.glsl.c' | \
    sed '/ORTHOGRAPHIC.GLSL.C/ r precompiled/view/vertex/orthographic.glsl.c' \
    > postcompiled/view/VertexShaders.js

clean:
	rm -f $(OUT)
